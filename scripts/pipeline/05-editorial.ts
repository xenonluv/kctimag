// 팀장 — Editor-in-Chief (편집장 칼럼)
// 2-pass(작성→이어쓰기→병합)로 2배+ 분량. Pass1: 도입+향후 영향 / Pass2: 문제점·긍정·전망.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmText } from "@/lib/llm";
import { writeLongform } from "@/lib/longform";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { Analysis } from "@/types/pipeline";
import type { Editorial } from "@/types/issue";

const EDITOR_SYS =
  "당신은 한국 문화 매거진의 편집장이다. 한 주의 문화 흐름을 통찰력 있게 꿰는 깊이 있는 칼럼을 쓴다. " +
  "개인적 시선과 문화적 통찰이 담긴 에세이적 산문으로, 단순 나열을 피한다.";

export async function editorial(analysis: Analysis): Promise<Editorial> {
  const issues = analysis.issues
    .map((i) => `#${i.rank} ${i.heading}: ${i.summary}`)
    .join("\n");

  const basePrompt =
    `이번 주 한국 문화 이슈들을 종합하는 편집장 칼럼을 쓴다.\n이슈:\n${issues}\n\n` +
    `지침:\n- 인상적인 도입으로 시작해 이번 주 문화 흐름의 큰 그림을 제시.\n` +
    `- 우선 **(1) 향후 영향** 을 깊이 다룬다.\n` +
    `- 에세이적·통찰적 산문(나열 금지).\n- 800자 이상. 제목 없이 Markdown 본문만.`;
  const continueHint =
    "이어서 **(2) 문제점·우려** 와 **(3) 긍정 요소**, 그리고 여운 있는 맺음말(전망)을 깊이 있게 전개하라.";

  const bodyMarkdown = await writeLongform({
    system: EDITOR_SYS,
    basePrompt,
    continueHint,
    passes: 2,
    mock: "이번 주 한국 문화는 두 축으로 움직였다. (mock 도입)\n\n**향후 영향** — (mock)",
  });

  const rawTitle = await llmText(
    `다음 편집장 칼럼에 어울리는 제목 한 줄만 출력하라(따옴표·설명·기호 없이):\n\n${bodyMarkdown.slice(0, 700)}`,
    { system: EDITOR_SYS },
    "편집장의 시선",
  );
  const title =
    rawTitle.trim().replace(/^["'#\s]+|["'\s]+$/g, "").split("\n")[0].slice(0, 60) ||
    "편집장의 시선";

  return { title, bodyMarkdown, author: "편집장" };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const analysis = readJson<Analysis>(path.join(tmpDir(slug), "analysis.json"));
  editorial(analysis)
    .then((e) => {
      const out = path.join(tmpDir(slug), "editorial.json");
      writeJson(out, e);
      console.log(`✅ 총평 완료 (${e.bodyMarkdown.length}자) → ${out}`);
    })
    .catch((e) => {
      console.error("❌ 총평 실패:", e);
      process.exit(1);
    });
}
