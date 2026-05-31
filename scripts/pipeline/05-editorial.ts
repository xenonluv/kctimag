// 팀장 — Editor-in-Chief (총평)
// 한 주 이슈를 종합해 향후 영향/문제점/긍정 요소를 균형 있게 다루는 편집장 칼럼.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmJson } from "@/lib/llm";
import { EditorialSchema } from "@/lib/schemas";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { Analysis } from "@/types/pipeline";
import type { Editorial } from "@/types/issue";

const EDITOR_SYS =
  "당신은 한국 문화 매거진 편집장이다. 한 주의 문화 흐름을 통찰력 있게 종합하는 칼럼을 쓴다.";

export async function editorial(analysis: Analysis): Promise<Editorial> {
  const issues = analysis.issues
    .map((i) => `#${i.rank} ${i.heading}: ${i.summary}`)
    .join("\n");
  return llmJson(
    `이번 주 한국 문화 이슈들을 종합하는 편집장 칼럼을 작성하라.\n이슈:\n${issues}\n\n` +
      `반드시 다음 세 측면을 균형 있게 다룬다: (1) 향후 영향 (2) 문제점/우려 (3) 긍정 요소.\n` +
      `형식: {"title":"칼럼 제목","bodyMarkdown":"본문(Markdown, 600자 이상)","author":"편집장"}`,
    EditorialSchema,
    { system: EDITOR_SYS },
    {
      title: "편집장의 시선",
      bodyMarkdown:
        "**향후 영향** — (mock)\n\n**문제점** — (mock)\n\n**긍정 요소** — (mock)",
      author: "편집장",
    },
  );
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const analysis = readJson<Analysis>(path.join(tmpDir(slug), "analysis.json"));
  editorial(analysis)
    .then((e) => {
      const out = path.join(tmpDir(slug), "editorial.json");
      writeJson(out, e);
      console.log(`✅ 총평 완료 → ${out}`);
    })
    .catch((e) => {
      console.error("❌ 총평 실패:", e);
      process.exit(1);
    });
}
