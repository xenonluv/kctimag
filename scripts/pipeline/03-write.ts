// 팀원3 — Writer (매거진 피처 작문)
// 피처 라이터 내러티브 + 2-pass(작성→이어쓰기→병합)로 매거진급 분량·깊이.
// 1위 이슈 = 커버스토리(더 길게). 본문은 lib/longform 으로 생성.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { llmJson } from "@/lib/llm";
import { writeLongform } from "@/lib/longform";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { Analysis, RawNews } from "@/types/pipeline";
import type { IssueSection, SourceRef } from "@/types/issue";

const WRITER_SYS =
  "당신은 한국 문화 매거진의 베테랑 피처 라이터다. 장면·인물·디테일이 살아있는 깊이 있는 한국어 산문을 쓴다. " +
  "사실에 근거하되 단순 요약·나열·불릿을 피하고, 흐름 있는 내러티브로 문화적 의미를 전한다. 과장·허위·추측성 단정은 하지 않는다.";

const MetaSchema = z.object({
  title: z.string(),
  dek: z.string(),
  theme: z.string(),
});

export interface WrittenDoc {
  title: string;
  dek: string;
  theme?: string;
  sections: IssueSection[];
}

function buildSources(srcs: RawNews["items"]): SourceRef[] {
  return srcs.map((s) => ({ title: s.title, link: s.link, pubDate: s.pubDate }));
}

export async function write(analysis: Analysis, raw: RawNews): Promise<WrittenDoc> {
  // 1) 호 제목/부제/테마
  const headings = analysis.issues
    .map((i) => `#${i.rank} ${i.heading} — ${i.summary}`)
    .join("\n");
  const meta = await llmJson(
    `이번 주 한국 문화 매거진의 "호 제목", "부제(dek)", "이번 호를 관통하는 테마 한 줄"을 지어라.\n` +
      `다룰 이슈:\n${headings}\n\n` +
      `형식: {"title":"매력적인 호 제목","dek":"1~2문장 부제","theme":"이번 호 흐름을 꿰는 한 줄"}`,
    MetaSchema,
    { system: WRITER_SYS },
    {
      title: "한 주의 한국 문화",
      dek: analysis.issues[0]?.summary ?? "",
      theme: "이번 주 한국 문화의 흐름",
    },
  );

  // 2) 섹션별 피처 작문 (1위 = 커버스토리, 더 길게)
  const sections: IssueSection[] = [];
  for (const issue of analysis.issues) {
    const isCover = issue.rank === 1;
    const srcs = issue.sourceIndexes.map((idx) => raw.items[idx]).filter(Boolean);
    const srcList =
      srcs.map((s) => `- ${s.title}\n  ${s.description}`).join("\n") ||
      "(참고 기사 없음 — 일반적 맥락으로 신중히 작성)";
    const targetChars = isCover ? 900 : 700;

    const basePrompt =
      `${isCover ? "[커버스토리]" : "[피처]"} 한국 문화 매거진 기사 본문을 작성하라.\n` +
      `주제: ${issue.heading}\n배경 요약: ${issue.summary}\n부서(카테고리): ${issue.category}\n` +
      `이번 호 테마: ${meta.theme}\n\n참고 기사(사실 근거):\n${srcList}\n\n` +
      `작성 지침:\n` +
      `- 매거진 피처 문체: 인상적인 장면/일화로 시작(리드) → 핵심 의미 → 맥락·배경·인물·디테일 전개.\n` +
      `- 단순 사실 나열/요약/불릿 금지. 흐름 있는 산문.\n` +
      `- 참고 기사 범위 내 사실에 근거. 모르는 사실을 지어내지 말 것.\n` +
      `- 핵심 문장 하나는 Markdown 인용(> ...) 한 줄로 강조해도 좋다. 소제목은 ## 사용.\n` +
      `- ${targetChars}자 이상.\n- 제목(h1) 없이 Markdown 본문만 출력.`;

    const continueHint = isCover
      ? "이 커버스토리를 더 깊이 전개하라 — 추가 맥락, 다른 관점·이해관계자의 목소리, 산업/사회적 함의, 향후 전망."
      : "이 기사를 더 전개하라 — 배경 맥락, 다른 시각, 문화적 의미와 전망.";

    const bodyMarkdown = await writeLongform({
      system: WRITER_SYS,
      basePrompt,
      continueHint,
      passes: isCover ? 3 : 2,
      mock: `## ${issue.heading}\n\n${issue.summary}\n\n> (mock 인용)\n\n(mock 본문 단락)`,
    });

    sections.push({
      id: `s${issue.rank}`,
      heading: issue.heading,
      rank: issue.rank,
      intensities: issue.intensities,
      category: issue.category,
      bodyMarkdown,
      // 인용구는 본문 내 > 블록으로 처리 → 별도 필드 생략
      images: [],
      sources: buildSources(srcs),
    });
  }

  return { title: meta.title, dek: meta.dek, theme: meta.theme, sections };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const analysis = readJson<Analysis>(path.join(tmpDir(slug), "analysis.json"));
  const raw = readJson<RawNews>(path.join(tmpDir(slug), "raw-news.json"));
  write(analysis, raw)
    .then((doc) => {
      const out = path.join(tmpDir(slug), "written.json");
      writeJson(out, doc);
      const chars = doc.sections.reduce((n, s) => n + s.bodyMarkdown.length, 0);
      console.log(
        `✅ 작문 완료: ${doc.sections.length}개 섹션, 약 ${chars}자 → ${out}`,
      );
    })
    .catch((e) => {
      console.error("❌ 작문 실패:", e);
      process.exit(1);
    });
}
