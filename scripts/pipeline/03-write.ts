// 팀원3 — Writer (매거진 작문)
// 이슈별 섹션을 분할 생성(출력 길이 한계 회피). 총 분량 A4 4장 이상을 목표.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { llmJson } from "@/lib/llm";
import { SourceRefSchema } from "@/lib/schemas";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { Analysis, RawNews } from "@/types/pipeline";
import type { IssueSection } from "@/types/issue";

const WRITER_SYS =
  "당신은 한국 문화 매거진의 전문 기자다. 깊이 있고 균형 잡힌 기사를 한국어로 쓴다. " +
  "사실에 근거하며 과장·허위·추측성 단정은 피한다.";

const MetaSchema = z.object({ title: z.string(), dek: z.string() });
const SectionContentSchema = z.object({
  bodyMarkdown: z.string(),
  pullQuote: z.string().optional(),
  sources: z.array(SourceRefSchema),
});

export interface WrittenDoc {
  title: string;
  dek: string;
  sections: IssueSection[];
}

export async function write(analysis: Analysis, raw: RawNews): Promise<WrittenDoc> {
  // 1) 호 제목/부제
  const headings = analysis.issues
    .map((i) => `#${i.rank} ${i.heading} — ${i.summary}`)
    .join("\n");
  const meta = await llmJson(
    `이번 주 한국 문화 매거진의 "호 제목"과 "부제"를 지어라.\n다룰 이슈:\n${headings}\n\n` +
      `형식: {"title":"매력적인 호 제목","dek":"1~2문장 요약"}`,
    MetaSchema,
    { system: WRITER_SYS },
    { title: "한 주의 한국 문화", dek: analysis.issues[0]?.summary ?? "" },
  );

  // 2) 섹션별 작문
  const sections: IssueSection[] = [];
  for (const issue of analysis.issues) {
    const srcs = issue.sourceIndexes.map((idx) => raw.items[idx]).filter(Boolean);
    const srcList = srcs
      .map((s) => `- ${s.title} (${s.link})\n  ${s.description}`)
      .join("\n");

    const content = await llmJson(
      `다음 이슈로 매거진 기사 섹션 본문을 작성하라.\n` +
        `이슈: ${issue.heading}\n요약: ${issue.summary}\n카테고리: ${issue.category}\n\n` +
        `참고 기사:\n${srcList || "(참고 기사 없음 — 일반적 맥락으로 작성)"}\n\n` +
        `요구사항:\n` +
        `- bodyMarkdown: 한국어 매거진 본문(Markdown, ## 소제목 사용 가능). 800자 이상, 도입-전개-맥락/전망 구조. 사실 기반.\n` +
        `- pullQuote: 본문에서 뽑은 인상적 한 줄(선택).\n` +
        `- sources: 참고 기사 {title, link} 배열.\n\n` +
        `형식: {"bodyMarkdown":"...","pullQuote":"...","sources":[{"title":"...","link":"..."}]}`,
      SectionContentSchema,
      { system: WRITER_SYS },
      {
        bodyMarkdown: `${issue.summary}\n\n(샘플 본문 — mock 모드)`,
        sources: srcs.map((s) => ({ title: s.title, link: s.link, pubDate: s.pubDate })),
      },
    );

    sections.push({
      id: `s${issue.rank}`,
      heading: issue.heading,
      rank: issue.rank,
      intensities: issue.intensities,
      category: issue.category,
      bodyMarkdown: content.bodyMarkdown,
      pullQuote: content.pullQuote,
      images: [],
      sources: content.sources.length
        ? content.sources
        : srcs.map((s) => ({ title: s.title, link: s.link, pubDate: s.pubDate })),
    });
  }

  return { title: meta.title, dek: meta.dek, sections };
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
      console.log(`✅ 작문 완료: ${doc.sections.length}개 섹션, 약 ${chars}자 → ${out}`);
    })
    .catch((e) => {
      console.error("❌ 작문 실패:", e);
      process.exit(1);
    });
}
