// run.ts — 전체 파이프라인 오케스트레이터 (Mac Studio launchd가 주 1회 실행).
// 큐레이션 다이제스트 + 편집장 픽 생성 → 발행.
//   드라이런: tsx scripts/pipeline/run.ts
//   발행:    PUBLISH=1 tsx scripts/pipeline/run.ts
import "@/lib/load-env";
import { execFileSync } from "node:child_process";
import { collect } from "./01-collect";
import { curate } from "./02-curate";
import { addImages } from "./04-images";
import { generatePdf } from "./06-pdf";
import { ceoGate, printGate } from "./07-ceo-gate";
import { publishToGit, pollDeploy, sendToSubscribers } from "./08-publish-send";
import { writeJson, issueJsonPath, tmpDir } from "@/lib/paths";
import { predictedPdfUrl, uploadPdf } from "@/lib/storage";
import { getRecentNews } from "@/lib/news-store";
import { getSiteUrl } from "@/lib/env";
import type { Issue } from "@/types/issue";
import type { NewsItem, RawNews } from "@/types/pipeline";

const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
const PUBLISH = process.env.PUBLISH === "1";
const SKIP_BUILD = process.env.SKIP_BUILD === "1";

async function main() {
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

  // ② 큐레이션
  console.log("② 큐레이션 (카테고리별 선별 + 편집장 픽)");
  const curated = await curate(raw);
  console.log(
    `   ${curated.categories.length}개 카테고리 · 픽 "${curated.editorPick.headline}"\n`,
  );

  // ④ 이미지 (기사 og:image)
  console.log("④ 이미지 (기사 og:image + 폴백)");
  const withImages = await addImages(curated);

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
      pdfUrl: predictedPdfUrl(slug) ?? undefined,
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
    console.log(`\n✅ 드라이런 완료. 발행: PUBLISH=1 tsx scripts/pipeline/run.ts ${slug}`);
    return;
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

  console.log("\n⑩ 구독자 메일 발송");
  await sendToSubscribers(slug, pdfPath);

  console.log("\n🎉 발행 완료!");
}

main().catch((e) => {
  console.error("\n❌ 파이프라인 실패:", e);
  process.exit(1);
});
