// run.ts — 전체 파이프라인 오케스트레이터 (Mac Studio launchd가 주 1회 실행).
// 큐레이션 다이제스트 + 편집장 픽 생성 → 발행.
//   제작·검수: ./scripts/make.sh [slug]      (생성만, push/메일 없음)
//   발행:      ./scripts/publish.sh [slug]   (재생성 없이 push→Vercel, 메일 제외)
import "@/lib/load-env";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { collect } from "./01-collect";
import { analyze } from "./02-analyze";
import { curate } from "./02-curate";
import { addImages } from "./04-images";
import { generatePdf } from "./06-pdf";
import { ceoGate, printGate } from "./07-ceo-gate";
import { publishToGit, pollDeploy, sendToSubscribers } from "./08-publish-send";
import { readJson, writeJson, issueJsonPath, tmpDir } from "@/lib/paths";
import { predictedPdfUrl, uploadPdf, pruneOldPdfs } from "@/lib/storage";
import { allSlugs } from "@/lib/content";
import { weeklyBackgroundUrl } from "@/lib/images/pollinations";
import { getRecentNews } from "@/lib/news-store";
import { getSiteUrl } from "@/lib/env";
import type { Issue } from "@/types/issue";
import type { NewsItem, RawNews } from "@/types/pipeline";

const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
const PUBLISH = process.env.PUBLISH === "1";
const PUBLISH_ONLY = process.env.PUBLISH_ONLY === "1"; // 재생성 없이 기존 issue.json만 발행
const SKIP_EMAIL = process.env.SKIP_EMAIL === "1"; // 구독자 메일 자동발송 건너뜀
const SKIP_BUILD = process.env.SKIP_BUILD === "1";

async function main() {
  // 발행 전용 모드 — 재생성 없이 검수한 기존 issue.json을 그대로 발행
  if (PUBLISH_ONLY) {
    if (!existsSync(issueJsonPath(slug))) {
      console.error(
        `\n❌ ${slug}호 issue.json이 없습니다 — 먼저 제작하세요(./scripts/make.sh ${slug}).`,
      );
      process.exit(1);
    }
    console.log(`\n🗞️  KCT — ${slug}호 발행 (기존 제작본, 재생성 없음)\n`);
    await publishIssue(slug);
    return;
  }

  console.log(
    `\n🗞️  KCT 파이프라인 — ${slug}호 ${PUBLISH ? "【발행】" : "【드라이런】"}\n`,
  );

  // ① 수집 (누적 + 당일)
  console.log("① 뉴스 수집 (누적 + 당일)");
  const fresh = await collect();
  let accumulated: NewsItem[] = [];
  try {
    accumulated = await getRecentNews(7);
  } catch (e) {
    console.warn("   누적(news_raw) 조회 건너뜀:", (e as Error).message);
  }
  const merged = new Map<string, NewsItem>();
  for (const it of [...accumulated, ...fresh.items]) merged.set(it.link, it);
  const items = [...merged.values()].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );
  const raw: RawNews = {
    collectedAt: new Date().toISOString(),
    weekRange: fresh.weekRange,
    totalCount: items.length,
    items,
  };
  writeJson(`${tmpDir(slug)}/raw-news.json`, raw);
  console.log(`   누적 ${accumulated.length} + 당일 ${fresh.items.length} → ${raw.totalCount}건\n`);

  // ② 우선순위 분석
  console.log("② 우선순위 분석 (수집 뉴스 기반 로컬 휴리스틱)");
  const analysis = analyze(raw);
  writeJson(`${tmpDir(slug)}/analysis.json`, analysis);
  console.log(`   ${analysis.issues.length}개 이슈 분석\n`);

  // ③ 큐레이션
  console.log("③ 큐레이션 (카테고리별 선별 + 편집장 픽)");
  const curated = await curate(raw, analysis);
  console.log(
    `   ${curated.categories.length}개 카테고리 · 픽 "${curated.editorPick.headline}"\n`,
  );

  // ④ 이미지 (무료·합법 레이어드: Wikimedia → Pexels → AI)
  console.log("④ 이미지 (Wikimedia → Pexels → AI 레이어드)");
  const withImages = await addImages(curated);

  // 큐레이션 규모 통계(자랑용): 수집 풀 카테고리별 분포 + 엄선 수
  const cdMap = new Map<string, number>();
  for (const it of raw.items)
    cdMap.set(it.categoryLabel, (cdMap.get(it.categoryLabel) ?? 0) + 1);
  const breakdown = [...cdMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const selected = withImages.categories.reduce(
    (s, c) => s + c.entries.length,
    0,
  );

  // 조립
  const issue: Issue = {
    meta: {
      slug,
      title: withImages.title,
      dek: withImages.dek,
      date: slug,
      weekRange: {
        from: raw.weekRange.from.slice(0, 10),
        to: raw.weekRange.to.slice(0, 10),
      },
      coverImageUrl: withImages.editorPick.image?.url,
      backgroundImageUrl: weeklyBackgroundUrl(slug),
      pdfUrl: predictedPdfUrl(slug) ?? undefined,
      curation: {
        scanned: raw.totalCount,
        selected,
        breakdown,
        rationale: withImages.selectionRationale,
      },
      analysis: {
        method: analysis.method,
        note: analysis.note,
        issueCount: analysis.issues.length,
      },
    },
    editorPick: withImages.editorPick,
    editorial: withImages.editorial,
    categories: withImages.categories,
    generatedAt: new Date().toISOString(),
  };
  writeJson(issueJsonPath(slug), issue);
  console.log(`   📄 content/issues/${slug}/issue.json\n`);

  // ⑦ CEO 게이트
  console.log("⑦ CEO 검증");
  const gate = ceoGate(issue);
  printGate(gate);
  if (!gate.passed) {
    console.error("\n발행 보류.");
    process.exit(1);
  }

  if (!SKIP_BUILD) {
    console.log("\n빌드 검증 (next build)…");
    execFileSync("npx", ["next", "build"], { stdio: "inherit" });
  }

  if (!PUBLISH) {
    console.log(`\n✅ 드라이런 완료. 발행: ./scripts/publish.sh ${slug}`);
    return;
  }

  await publishIssue(slug);
}

// 발행 단계(보존정리 → git push → 배포 폴링 → PDF → 메일). PUBLISH / PUBLISH_ONLY 공용.
async function publishIssue(slug: string) {
  // 보존 정책 — 최근 N호 PDF만 Storage 유지(무료 한도). 오래된 PDF 삭제 + 해당 issue.json pdfUrl 비움.
  const KEEP_PDF_WEEKS = Number(process.env.KEEP_PDF_WEEKS || 8);
  try {
    const keep = [...new Set([slug, ...allSlugs()])]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, KEEP_PDF_WEEKS);
    const pruned = await pruneOldPdfs(keep);
    for (const s of pruned) {
      try {
        const it = readJson<Issue>(issueJsonPath(s));
        if (it.meta.pdfUrl) {
          delete it.meta.pdfUrl;
          writeJson(issueJsonPath(s), it);
        }
      } catch {
        /* 해당 호 파일 없음 무시 */
      }
    }
    if (pruned.length)
      console.log(
        `   🧹 PDF 보존정리: ${pruned.length}개 삭제(최근 ${KEEP_PDF_WEEKS}호만 유지)`,
      );
  } catch (e) {
    console.warn("   PDF 보존정리 건너뜀:", (e as Error).message);
  }

  // ⑧ 발행
  console.log("\n⑧ 발행 — git push → Vercel");
  publishToGit(slug);
  const ok = await pollDeploy(slug);
  console.log(ok ? "   배포 확인됨" : "   ⚠️ 배포 확인 실패(계속)");

  console.log("\n⑨ PDF 생성");
  process.env.PDF_BASE_URL = getSiteUrl();
  const pdfPath = await generatePdf(slug);
  await uploadPdf(slug, pdfPath).catch((e) =>
    console.warn("   PDF 업로드 건너뜀:", (e as Error).message),
  );

  if (SKIP_EMAIL) {
    console.log(
      "\n⑩ 구독자 메일 — 건너뜀(SKIP_EMAIL=1). /admin에서 수동 발송하세요.",
    );
  } else {
    console.log("\n⑩ 구독자 메일 발송");
    await sendToSubscribers(slug, pdfPath);
  }

  console.log("\n🎉 발행 완료!");
}

main().catch((e) => {
  console.error("\n❌ 파이프라인 실패:", e);
  process.exit(1);
});
