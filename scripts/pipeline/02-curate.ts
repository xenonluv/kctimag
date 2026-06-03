// 팀원2+3 — Curator (큐레이션)
// 수집 뉴스에서 카테고리별 대표 항목을 선별하고, 이번 주 최대 이슈(편집장 픽)를 뽑는다.
// AI 합성 기사 대신 "실제 뉴스 목록 + 1줄 설명 + 편집장 픽" 다이제스트를 만든다.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmJson } from "@/lib/llm";
import { CurateSchema, type Curate } from "@/lib/schemas";
import { CULTURE_CATEGORIES } from "@/lib/categories";
import { outletFromUrl } from "@/lib/og-image";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { Analysis, AnalyzedIssue, RawNews } from "@/types/pipeline";
import type {
  CategorySection,
  EditorPick,
  EditorialNote,
  NewsEntry,
  NewsPriorityAnalysis,
} from "@/types/issue";

const CURATOR_SYS =
  "당신은 한국 문화 매거진의 깐깐한 큐레이션 데스크다. 한 주간 쏟아진 노이즈 많은 뉴스 후보에서 " +
  "정말 중요한 것만 안목 있게 골라낸다. 화보·외모·일상 사진, 단순 근황·출연, 홍보성 기사, " +
  "문화와 무관한 정치·사건사고는 단호히 버린다. 전국·글로벌 반향과 산업 영향이 큰 뉴스를 우선하며, " +
  "수집 쿼리가 아니라 기사 내용으로 카테고리를 판단한다.";

const PER_CAT = Number(process.env.CURATE_PER_CAT || 20); // 카테고리별 상위 N건 균형 샘플
const MAX_INPUT = Number(process.env.CURATE_MAX_INPUT || 400); // 전체 입력 상한
const MAX_ANALYSIS_ISSUES = 80;
const MAX_ISSUES_PER_CAT = 8;
const MAX_ARTICLES_PER_ISSUE = 3;

export interface CuratedDoc {
  title: string;
  dek: string;
  /** 홈 상단 — 이번 주 전반 선정 이유(3문장 내외) */
  selectionRationale?: string;
  categories: CategorySection[];
  editorPick: EditorPick;
  editorial: EditorialNote;
}

function labelOf(key: string): string {
  return CULTURE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function toEntry(
  pool: RawNews["items"],
  index: number,
  blurb: string,
): NewsEntry | null {
  const it = pool[index];
  if (!it) return null;
  const link = it.originallink || it.link;
  return {
    headline: it.title,
    link,
    outlet: outletFromUrl(link),
    pubDate: it.pubDate,
    blurb,
  };
}

interface CandidateMeta {
  rawIndex: number;
  issue?: AnalyzedIssue;
}

function toPriority(issue?: AnalyzedIssue): NewsPriorityAnalysis | undefined {
  if (!issue) return undefined;
  return {
    rank: issue.rank,
    score: issue.score,
    scores: issue.scores,
    rationale: issue.rationale,
    sourceCount: issue.sourceCount,
    outletCount: issue.outletCount,
  };
}

function buildFallbackCandidates(raw: RawNews): {
  candidateItems: RawNews["items"];
  candidateMeta: CandidateMeta[];
} {
  // 카테고리별 균형 샘플 — raw.items 는 카테고리 순으로 쌓여 있어 slice(0,N)은 첫 카테고리에 편중된다.
  const byCat = new Map<string, RawNews["items"]>();
  for (const it of raw.items) {
    const arr = byCat.get(it.categoryLabel) ?? [];
    arr.push(it);
    byCat.set(it.categoryLabel, arr);
  }
  const candidateItems: RawNews["items"] = [];
  const candidateMeta: CandidateMeta[] = [];
  for (const arr of byCat.values()) {
    for (const it of arr.slice(0, PER_CAT)) {
      const rawIndex = raw.items.indexOf(it);
      if (rawIndex < 0) continue;
      candidateItems.push(it);
      candidateMeta.push({ rawIndex });
    }
  }
  return {
    candidateItems: candidateItems.slice(0, MAX_INPUT),
    candidateMeta: candidateMeta.slice(0, MAX_INPUT),
  };
}

function buildAnalysisCandidates(
  raw: RawNews,
  analysis: Analysis,
): {
  candidateItems: RawNews["items"];
  candidateMeta: CandidateMeta[];
} {
  const selectedIssues: AnalyzedIssue[] = [];
  const perCat = new Map<string, number>();
  for (const issue of analysis.issues) {
    if (selectedIssues.length >= MAX_ANALYSIS_ISSUES) break;
    const count = perCat.get(issue.category) ?? 0;
    if (count >= MAX_ISSUES_PER_CAT) continue;
    selectedIssues.push(issue);
    perCat.set(issue.category, count + 1);
  }

  const candidateItems: RawNews["items"] = [];
  const candidateMeta: CandidateMeta[] = [];
  const seenRawIndexes = new Set<number>();
  for (const issue of selectedIssues) {
    const rawIndexes = [
      issue.primaryIndex,
      ...issue.sourceIndexes.filter((idx) => idx !== issue.primaryIndex),
    ].slice(0, MAX_ARTICLES_PER_ISSUE);
    for (const rawIndex of rawIndexes) {
      if (seenRawIndexes.has(rawIndex)) continue;
      const item = raw.items[rawIndex];
      if (!item) continue;
      seenRawIndexes.add(rawIndex);
      candidateItems.push(item);
      candidateMeta.push({ rawIndex, issue });
      if (candidateItems.length >= MAX_INPUT) {
        return { candidateItems, candidateMeta };
      }
    }
  }

  return { candidateItems, candidateMeta };
}

function issueContext(issue?: AnalyzedIssue): string {
  if (!issue) return "";
  return (
    ` | issueRank=${issue.rank}, score=${issue.score}, ` +
    `중요도=${issue.scores.importance}, 파급력=${issue.scores.impact}, ` +
    `관심도=${issue.scores.interest}, 심리=${issue.scores.psychological}, ` +
    `실시간=${issue.scores.realtime}, 기사=${issue.sourceCount}, 매체=${issue.outletCount}`
  );
}

function findIssueForEntry(
  rawIndex: number,
  issueRank: number | undefined,
  candidateIssue: AnalyzedIssue | undefined,
  analysis: Analysis | undefined,
): AnalyzedIssue | undefined {
  const rankedIssue =
    issueRank === undefined
      ? undefined
      : analysis?.issues.find(
          (it) => it.rank === issueRank && it.sourceIndexes.includes(rawIndex),
        );
  return (
    rankedIssue ||
    candidateIssue ||
    analysis?.issues.find((it) => it.sourceIndexes.includes(rawIndex))
  );
}

export async function curate(
  raw: RawNews,
  analysis?: Analysis,
): Promise<CuratedDoc> {
  let { candidateItems, candidateMeta } =
    analysis && analysis.issues.length
      ? buildAnalysisCandidates(raw, analysis)
      : buildFallbackCandidates(raw);
  if (candidateItems.length === 0) {
    ({ candidateItems, candidateMeta } = buildFallbackCandidates(raw));
  }

  const list = candidateItems
    .map(
      (it, i) =>
        `${i}. [${it.categoryLabel}] ${it.title} — ${it.description.slice(0, 80)}${issueContext(candidateMeta[i]?.issue)}`,
    )
    .join("\n");
  const keys = CULTURE_CATEGORIES.map((c) => c.key).join(", ");

  const mock: Curate = {
    title: "이번 주 한국 문화",
    dek: "한 주간의 문화 뉴스 다이제스트",
    selectionRationale:
      "(mock) 이번 주는 글로벌 반향과 산업 영향이 큰 소식을 우선해, 화제성만 높은 가십은 걷어내고 흐름을 바꾸는 뉴스만 추렸습니다.",
    categories: [
      { key: "kpop", entries: [{ index: 0, blurb: "(mock) 설명", imagePrompt: "kpop concert stage", imageQuery: "kpop concert stage" }], note: "(mock) 이번 주 K-pop 선정 이유" },
      { key: "screen", entries: [{ index: Math.min(1, Math.max(0, candidateItems.length - 1)), blurb: "(mock) 설명", imagePrompt: "film production set", imageQuery: "film set" }], note: "(mock) 이번 주 영화 선정 이유" },
    ],
    editorPick: { index: 0, why: "(mock) 이번 주 가장 큰 이슈로 선정.", imagePrompt: "korean culture concept", imageQuery: "korean culture" },
    editorial: { title: "이번 주 흐름", body: "(mock) 이번 주 문화 트렌드 총평." },
  };

  const result = await llmJson(
    `다음은 최근 한 주간 수집된 한국 문화 관련 뉴스 후보다(인덱스 포함). 노이즈가 많으니 안목 있게 골라라.\n` +
      (analysis
        ? `아래 점수는 외부 검색량/SNS 반응이 아니라 수집 뉴스 풀 기반 추정치다. 원시 기사 수보다 서로 다른 언론사 수와 문화적 의미를 더 신뢰하라. 홍보성 보도자료, 선정적 클릭베이트, 단순 근황은 점수가 높아도 제외하라.\n`
        : "") +
      `\n${list}\n\n` +
      `【선정 기준 — 중요도 순】\n` +
      `- 전국적·글로벌 반향, 산업·사회적 영향, 신기록·수상·차트 성과, 주요 아티스트·작품·기업의 의미 있는 소식, 대중 화제성 큰 것을 우선.\n` +
      `- BTS·블랙핑크 등 글로벌급 뉴스나 업계 판도를 바꾸는 소식이 있으면 반드시 상위로.\n` +
      `【반드시 제외】\n` +
      `- 화보·패션·외모 묘사·직캠·일상 사진, 단순 출연·근황·SNS 소식 등 저가치 기사.\n` +
      `- 단순 신제품 나열 등 홍보성 보도자료.\n` +
      `- 문화와 무관한 기사(정치·선거·공약, 사건사고, 일반 경제/증시 등) → 키워드가 걸렸어도 버려라.\n` +
      `【카테고리】 수집 쿼리는 무시하고 **기사 내용으로 올바른 카테고리**를 배정. 맞는 카테고리가 없으면 제외. key는 다음만: ${keys}\n\n` +
      `할 일:\n` +
      `1. 카테고리별 대표 뉴스는 **반드시 정확히 3건** 선별(2건 이하 금지, 4건 이상 금지. 같은 사건 중복은 가장 대표적 1건만).\n` +
      `2. 각 항목 blurb = **2~3문장**(무슨 일 + 맥락 + 왜 중요한지). 짧게 쓰지 말 것.\n` +
      `3. 각 항목 imagePrompt = 그 기사를 상징하는 **영어 이미지 생성 프롬프트**(개념·분위기 일러스트. ⚠️실존 인물 얼굴·로고·텍스트 금지. 예: "kpop idol group silhouette on a glowing stage, fans cheering").\n` +
      `3-1. 각 항목 imageQuery = 스톡/위키 **사진 검색용 구체 영어 키워드**(실제 주제·장소·작품·사물의 명사 위주. 예: "Gyeongbokgung palace night", "esports arena crowd", "Korean street food market"). 추상 표현 말고 검색에 바로 쓸 구체 명사로.\n` +
      `4. editorPick = 전체에서 이번 주 "가장 큰 이슈" 1건 + why(3~5문장) + imagePrompt + imageQuery.\n` +
      `5. title(호 제목) + dek(부제).\n` +
      `6. editorial = 이번 주 문화 흐름 전반 총평. title + body. ⚠️body는 반드시 **600자 이상 900자 이하**(한국어, 공백 포함), **3개 문단 이상**으로 충분히 길게. 단순 나열이 아니라 한 주를 관통하는 흐름·맥락·전망을 담은 통찰적인 에세이로. 너무 짧으면 다시 써라.\n` +
      `7. 각 카테고리마다 note = **이번 주 이 카테고리에서 왜 이 뉴스들을 골랐는지** 1~2문장 큐레이션 코멘트(개별 기사 요약 반복 금지. 이 섹션의 이번 주 흐름·선정 관점·의미를 독자에게 말하듯 간결히).\n` +
      `8. selectionRationale = 홈 상단에 들어갈 **이번 주 전반 선정 이유 3문장 내외**(이번 주 큐레이션의 기준·관점·두드러진 흐름을 독자에게 어필하듯 간결하고 자신감 있게. 개별 기사 나열 금지).\n\n` +
      `index는 0~${candidateItems.length - 1} 정수만 사용. issueRank가 보이면 해당 값을 entries에 optional로 함께 넣어도 된다.\n` +
      `형식: {"title","dek","selectionRationale","categories":[{"key","entries":[정확히 3개 {"index","issueRank","blurb","imagePrompt","imageQuery"}],"note"}],"editorPick":{"index","why","imagePrompt","imageQuery","honorableIndexes":[]},"editorial":{"title","body"}}`,
    CurateSchema,
    { system: CURATOR_SYS },
    mock,
  );

  // 조립
  const categories: CategorySection[] = [];
  for (const cat of result.categories) {
    const entries: NewsEntry[] = [];
    const seen = new Set<string>();
    for (const e of cat.entries) {
      const rawIndex = candidateMeta[e.index]?.rawIndex;
      if (rawIndex === undefined) continue;
      const entry = toEntry(raw.items, rawIndex, e.blurb);
      if (!entry || seen.has(entry.link)) continue;
      entry.imagePrompt = e.imagePrompt;
      entry.imageQuery = e.imageQuery;
      const issue = findIssueForEntry(
        rawIndex,
        e.issueRank,
        candidateMeta[e.index]?.issue,
        analysis,
      );
      entry.analysis = toPriority(issue);
      seen.add(entry.link);
      entries.push(entry);
    }
    if (entries.length)
      categories.push({ key: cat.key, label: labelOf(cat.key), entries, note: cat.note });
  }

  const pickRawIndex = candidateMeta[result.editorPick.index]?.rawIndex;
  const pickItem = pickRawIndex === undefined ? undefined : raw.items[pickRawIndex];
  const pickLink = pickItem ? pickItem.originallink || pickItem.link : "";
  const pickIssue =
    pickRawIndex === undefined
      ? undefined
      : candidateMeta[result.editorPick.index]?.issue ||
        analysis?.issues.find((it) => it.sourceIndexes.includes(pickRawIndex));
  const editorPick: EditorPick = {
    headline: pickItem?.title ?? "이번 주의 픽",
    link: pickLink,
    outlet: outletFromUrl(pickLink),
    why: result.editorPick.why,
    imagePrompt: result.editorPick.imagePrompt,
    imageQuery: result.editorPick.imageQuery,
    analysis: toPriority(pickIssue),
    honorableMentions: (result.editorPick.honorableIndexes ?? [])
      .map((i) => {
        const rawIndex = candidateMeta[i]?.rawIndex;
        return rawIndex === undefined ? undefined : raw.items[rawIndex];
      })
      .filter((it): it is RawNews["items"][number] => Boolean(it))
      .map((it) => ({ headline: it.title, link: it.originallink || it.link })),
  };

  return {
    title: result.title,
    dek: result.dek,
    selectionRationale: result.selectionRationale,
    categories,
    editorPick,
    editorial: {
      title: result.editorial.title,
      bodyMarkdown: result.editorial.body,
    },
  };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const raw = readJson<RawNews>(path.join(tmpDir(slug), "raw-news.json"));
  let analysis: Analysis | undefined;
  try {
    analysis = readJson<Analysis>(path.join(tmpDir(slug), "analysis.json"));
  } catch {
    analysis = undefined;
  }
  curate(raw, analysis)
    .then((doc) => {
      const out = path.join(tmpDir(slug), "curated.json");
      writeJson(out, doc);
      const n = doc.categories.reduce((s, c) => s + c.entries.length, 0);
      console.log(
        `✅ 큐레이션 완료: ${doc.categories.length}개 카테고리 · ${n}개 항목 · 픽 "${doc.editorPick.headline}" → ${out}`,
      );
    })
    .catch((e) => {
      console.error("❌ 큐레이션 실패:", e);
      process.exit(1);
    });
}
