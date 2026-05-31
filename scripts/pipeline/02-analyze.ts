// 팀원2 — Analyst (이슈 분석/순위)
// 수집 뉴스를 Claude로 분석해 4대 강도(뉴스/심리/실시간)로 상위 이슈를 랭킹.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmJson } from "@/lib/llm";
import { AnalysisSchema } from "@/lib/schemas";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { RawNews, Analysis } from "@/types/pipeline";

const SYSTEM =
  "당신은 한국 문화 전문 뉴스 분석가다. 한 주간 문화 뉴스를 읽고 가장 중요한 이슈를 " +
  "객관적 근거로 선별·순위화한다. 과장·허위 없이 사실에 기반해 분석한다.";

const MOCK: { issues: Analysis["issues"] } = {
  issues: [
    {
      rank: 1,
      heading: "신인 아이돌 그룹 글로벌 차트 진입",
      category: "K-pop·음악",
      summary: "신인 그룹이 데뷔 첫 주 글로벌 차트 상위권에 진입.",
      intensities: { news: 92, psychological: 78, realtime: 95 },
      score: 90,
      rationale: "보도량과 실시간 화제성이 모두 최상위.",
      sourceIndexes: [0, 1],
    },
    {
      rank: 2,
      heading: "국립극장 전통-현대 융합 무대",
      category: "공연·연극",
      summary: "판소리와 현대무용을 결합한 신작이 호평.",
      intensities: { news: 71, psychological: 84, realtime: 62 },
      score: 76,
      rationale: "심리적 공감대가 높고 평단 호평.",
      sourceIndexes: [2],
    },
  ],
};

export async function analyze(raw: RawNews): Promise<Analysis> {
  const items = raw.items.slice(0, 250);
  const list = items
    .map(
      (it, i) =>
        `${i}. [${it.categoryLabel}] ${it.title} (${it.pubDate.slice(0, 10)}) — ${it.description.slice(0, 90)}`,
    )
    .join("\n");

  const prompt =
    `다음은 최근 7일간 수집된 한국 문화 뉴스 목록이다(인덱스 포함).\n\n${list}\n\n` +
    `위 뉴스에서 이번 주 가장 중요한 핵심 이슈 6~8개를 선정해 분석하라.\n` +
    `각 이슈 객체 필드:\n` +
    `- rank: 1부터의 순위(정수)\n- heading: 이슈 제목\n- category: 문화 카테고리\n- summary: 2~3문장 요약\n` +
    `- intensities: { news, psychological, realtime } 각 0-100 정수\n` +
    `  · news=보도 빈도/규모, psychological=감성·공감 강도, realtime=최신성·확산 속도\n` +
    `- score: 종합 점수 0-100\n- rationale: 선정 근거\n` +
    `- sourceIndexes: 위 목록에서 근거가 된 인덱스 배열(이슈당 2~6개)\n\n` +
    `형식: {"issues":[{...}, ...]}`;

  const result = await llmJson(prompt, AnalysisSchema, { system: SYSTEM }, MOCK);
  // 순위 정렬 보정
  result.issues.sort((a, b) => a.rank - b.rank);
  return { analyzedAt: new Date().toISOString(), issues: result.issues };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const raw = readJson<RawNews>(path.join(tmpDir(slug), "raw-news.json"));
  analyze(raw)
    .then((a) => {
      const out = path.join(tmpDir(slug), "analysis.json");
      writeJson(out, a);
      console.log(`✅ 분석 완료: ${a.issues.length}개 이슈 → ${out}`);
    })
    .catch((e) => {
      console.error("❌ 분석 실패:", e);
      process.exit(1);
    });
}
