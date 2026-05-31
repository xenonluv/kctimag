// CEO — Publisher (검증·발행 허가)
// 발행 전 자동 QA 게이트. 통과해야만 발행(커밋·push·메일)이 진행된다.
// 빌드 검증(next build)은 run.ts가 별도로 수행한다.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, issueJsonPath } from "@/lib/paths";
import type { Issue } from "@/types/issue";
import type { GateResult } from "@/types/pipeline";

// A4 1장 ≈ 1,000자(한국어 기준) → 4장 = 약 4,000자. 안전 하한 3,000자.
const MIN_BODY_CHARS = 3000;

export function ceoGate(issue: Issue): GateResult {
  const checks: GateResult["checks"] = [];
  const add = (name: string, passed: boolean, detail: string) =>
    checks.push({ name, passed, detail });

  // 1) 메타 필수 필드
  const m = issue.meta;
  add(
    "메타 필드",
    !!(m?.slug && m?.title && m?.dek && m?.date),
    "slug/title/dek/date 존재 여부",
  );

  // 2) 표지 이미지
  add(
    "표지 이미지",
    !!m?.coverImage && (!!m.coverImage.url || m.coverImage.kind === "link"),
    "coverImage 존재",
  );

  // 3) 섹션 개수
  add("섹션 개수", (issue.sections?.length ?? 0) >= 3, `${issue.sections?.length ?? 0}개 (>=3)`);

  // 4) 각 섹션 본문/제목
  const emptySection = issue.sections?.find(
    (s) => !s.heading?.trim() || !s.bodyMarkdown?.trim(),
  );
  add("섹션 내용", !emptySection, emptySection ? `빈 섹션: ${emptySection.id}` : "모든 섹션 제목·본문 존재");

  // 5) 총 분량 (A4 4장)
  const totalChars = (issue.sections ?? []).reduce(
    (n, s) => n + (s.bodyMarkdown?.length ?? 0),
    0,
  );
  add("분량(A4 4장)", totalChars >= MIN_BODY_CHARS, `${totalChars}자 (>=${MIN_BODY_CHARS})`);

  // 6) 이미지: 각 섹션 1개 이상(link 포함) + URL 형식
  const badImage = issue.sections?.find((s) => {
    if (!s.images || s.images.length === 0) return true;
    return s.images.some(
      (img) =>
        img.kind !== "link" && !/^https?:\/\//.test(img.url),
    );
  });
  add("이미지", !badImage, badImage ? `이미지 문제 섹션: ${badImage.id}` : "모든 섹션 이미지 OK");

  // 7) 편집장 총평
  add(
    "편집장 총평",
    !!issue.editorial?.bodyMarkdown?.trim() && !!issue.editorial?.title?.trim(),
    "editorial 존재",
  );

  // 8) 출처 표기 (각 섹션 최소 1개 출처 권장)
  const noSource = issue.sections?.find((s) => !s.sources || s.sources.length === 0);
  add("출처 표기", !noSource, noSource ? `출처 없음: ${noSource.id}` : "모든 섹션 출처 존재");

  const passed = checks.every((c) => c.passed);
  return {
    passed,
    checks,
    approvedAt: passed ? new Date().toISOString() : undefined,
  };
}

export function printGate(result: GateResult): void {
  console.log("\n── CEO 검증 게이트 ──");
  for (const c of result.checks) {
    console.log(`  ${c.passed ? "✅" : "❌"} ${c.name}: ${c.detail}`);
  }
  console.log(result.passed ? "\n🟢 발행 허가" : "\n🔴 발행 보류 (위 항목 수정 필요)");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const issue = readJson<Issue>(issueJsonPath(slug));
  const result = ceoGate(issue);
  printGate(result);
  process.exit(result.passed ? 0 : 1);
}
