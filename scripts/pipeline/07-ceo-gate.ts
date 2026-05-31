// CEO — Publisher (검증·발행 허가) — 다이제스트 기준.
import "@/lib/load-env";
import { fileURLToPath } from "node:url";
import { readJson, issueJsonPath } from "@/lib/paths";
import type { Issue } from "@/types/issue";
import type { GateResult } from "@/types/pipeline";

const MIN_CATEGORIES = 4;
const MIN_ENTRIES = 10;

export function ceoGate(issue: Issue): GateResult {
  const checks: GateResult["checks"] = [];
  const add = (name: string, passed: boolean, detail: string) =>
    checks.push({ name, passed, detail });

  const m = issue.meta;
  add("메타 필드", !!(m?.slug && m?.title && m?.dek && m?.date), "slug/title/dek/date 존재");

  const catCount = issue.categories?.length ?? 0;
  add("카테고리 수", catCount >= MIN_CATEGORIES, `${catCount}개 (>=${MIN_CATEGORIES})`);

  const total = (issue.categories ?? []).reduce(
    (s, c) => s + (c.entries?.length ?? 0),
    0,
  );
  add("뉴스 항목 수", total >= MIN_ENTRIES, `${total}개 (>=${MIN_ENTRIES})`);

  const badEntry = (issue.categories ?? [])
    .flatMap((c) => c.entries ?? [])
    .find((e) => !e.headline?.trim() || !/^https?:\/\//.test(e.link || ""));
  add(
    "항목 유효성",
    !badEntry,
    badEntry ? `문제 항목: ${badEntry.headline || "(제목 없음)"}` : "모든 항목 제목·링크 유효",
  );

  const p = issue.editorPick;
  add(
    "편집장 픽",
    !!(p?.headline?.trim() && p?.why?.trim() && /^https?:\/\//.test(p?.link || "")),
    "픽 제목·선정이유·링크 존재",
  );

  const passed = checks.every((c) => c.passed);
  return { passed, checks, approvedAt: passed ? new Date().toISOString() : undefined };
}

export function printGate(result: GateResult): void {
  console.log("\n── CEO 검증 게이트 ──");
  for (const c of result.checks) {
    console.log(`  ${c.passed ? "✅" : "❌"} ${c.name}: ${c.detail}`);
  }
  console.log(result.passed ? "\n🟢 발행 허가" : "\n🔴 발행 보류");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const issue = readJson<Issue>(issueJsonPath(slug));
  const result = ceoGate(issue);
  printGate(result);
  process.exit(result.passed ? 0 : 1);
}
