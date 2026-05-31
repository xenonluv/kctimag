// run.ts — 전체 파이프라인 오케스트레이터 (Mac Studio launchd가 주 1회 실행).
// 기본은 드라이런(발행/발송 안 함). 실제 발행은 PUBLISH=1 환경변수로.
//   사용: tsx scripts/pipeline/run.ts [slug]
//   드라이런: tsx scripts/pipeline/run.ts
//   발행:    PUBLISH=1 tsx scripts/pipeline/run.ts
import "@/lib/load-env";
import { execFileSync } from "node:child_process";
import { collect } from "./01-collect";
import { analyze } from "./02-analyze";
import { write } from "./03-write";
import { illustrate } from "./04-illustrate";
import { editorial } from "./05-editorial";
import { generatePdf } from "./06-pdf";
import { ceoGate, printGate } from "./07-ceo-gate";
import { publishToGit, pollDeploy, sendToSubscribers } from "./08-publish-send";
import { writeJson, issueJsonPath, tmpDir } from "@/lib/paths";
import { predictedPdfUrl, uploadPdf } from "@/lib/storage";
import { getSiteUrl } from "@/lib/env";
import type { Issue } from "@/types/issue";

const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
const PUBLISH = process.env.PUBLISH === "1";
const SKIP_BUILD = process.env.SKIP_BUILD === "1";

async function main() {
  console.log(
    `\n🗞️  KCT 파이프라인 — ${slug}호 ${PUBLISH ? "【발행 모드】" : "【드라이런】"}\n`,
  );

  console.log("① 팀원1 — 뉴스 수집");
  const raw = await collect();
  writeJson(`${tmpDir(slug)}/raw-news.json`, raw);
  console.log(`   ${raw.totalCount}건\n`);

  console.log("② 팀원2 — 이슈 분석");
  const analysis = await analyze(raw);
  writeJson(`${tmpDir(slug)}/analysis.json`, analysis);
  console.log(`   ${analysis.issues.length}개 이슈\n`);

  console.log("③ 팀원3 — 매거진 작문");
  const written = await write(analysis, raw);
  writeJson(`${tmpDir(slug)}/written.json`, written);
  const chars = written.sections.reduce((n, s) => n + s.bodyMarkdown.length, 0);
  console.log(`   ${written.sections.length}섹션 · 약 ${chars}자\n`);

  console.log("④ 팀원4 — 이미지");
  const illustrated = await illustrate(written);
  console.log(`   표지 + ${illustrated.sections.length}섹션 이미지\n`);

  console.log("⑤ 팀장 — 총평");
  const ed = await editorial(analysis);
  console.log(`   "${ed.title}"\n`);

  // 조립
  const issue: Issue = {
    meta: {
      slug,
      title: illustrated.title,
      dek: illustrated.dek,
      date: slug,
      weekRange: {
        from: raw.weekRange.from.slice(0, 10),
        to: raw.weekRange.to.slice(0, 10),
      },
      coverImage: illustrated.coverImage,
      pdfUrl: predictedPdfUrl(slug) ?? undefined,
    },
    sections: illustrated.sections,
    editorial: ed,
    generatedAt: new Date().toISOString(),
  };
  writeJson(issueJsonPath(slug), issue);
  console.log(`   📄 content/issues/${slug}/issue.json\n`);

  console.log("⑥ CEO — 검증 게이트");
  const gate = ceoGate(issue);
  printGate(gate);
  if (!gate.passed) {
    console.error("\n발행 보류 — 위 항목을 충족하지 못했습니다.");
    process.exit(1);
  }

  if (!SKIP_BUILD) {
    console.log("\n⑦ 빌드 검증 (next build)…");
    execFileSync("npx", ["next", "build"], { stdio: "inherit" });
  }

  if (!PUBLISH) {
    console.log("\n✅ 드라이런 완료. 실제 발행: PUBLISH=1 tsx scripts/pipeline/run.ts " + slug);
    return;
  }

  console.log("\n⑧ 발행 — git push → Vercel");
  publishToGit(slug);
  const ok = await pollDeploy(slug);
  console.log(ok ? "   배포 확인됨" : "   ⚠️ 배포 확인 실패(계속)");

  console.log("\n⑨ PDF 생성 (배포 사이트 렌더)");
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
