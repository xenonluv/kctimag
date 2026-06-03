// 팀원2 — Analyzer (우선순위 분석)
// raw.items 전체를 로컬 휴리스틱으로 이슈 단위 클러스터링하고 점수화한다.
// 외부 API·크롤링·LLM 호출 없이 "수집 뉴스 기반 우선순위 추정치"만 만든다.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { outletFromUrl } from "@/lib/og-image";
import { shouldExclude } from "@/lib/news-filter";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type {
  Analysis,
  AnalyzedIssue,
  IssueScores,
  NewsItem,
  RawNews,
} from "@/types/pipeline";

interface Candidate {
  rawIndex: number;
  item: NewsItem;
  link: string;
  outlet: string;
  text: string;
  tokens: Set<string>;
}

interface Cluster {
  category: string;
  candidates: Candidate[];
  tokens: Set<string>;
}

const STOPWORDS = new Set([
  "관련",
  "뉴스",
  "문화",
  "한국",
  "단독",
  "종합",
  "공개",
  "진행",
  "개최",
  "출시",
  "오늘",
  "이번",
  "지난",
  "최근",
  "대상",
  "기자",
  "사진",
  "영상",
  "공식",
  "브랜드",
]);

const MAJOR_TERMS = [
  "BTS",
  "방탄소년단",
  "블랙핑크",
  "BLACKPINK",
  "뉴진스",
  "아이브",
  "르세라핌",
  "세븐틴",
  "스트레이 키즈",
  "넷플릭스",
  "Netflix",
  "네이버웹툰",
  "올리브영",
  "하이브",
  "SM",
  "YG",
  "JYP",
  "T1",
  "LCK",
];

const IMPORTANCE_TERMS = [
  "기록",
  "수상",
  "차트",
  "흥행",
  "투자",
  "인수",
  "계약",
  "선판매",
  "산업",
  "시장",
  "1위",
  "최초",
  "확정",
  "돌파",
  "성과",
];

const IMPACT_TERMS = [
  "글로벌",
  "해외",
  "북미",
  "미국",
  "일본",
  "중국",
  "수출",
  "플랫폼",
  "팬덤",
  "관객",
  "매출",
  "100만",
  "500개",
  "국가",
  "권역",
  "세계",
];

const PSYCHOLOGICAL_TERMS = [
  "논란",
  "반발",
  "열풍",
  "품절",
  "기대",
  "깜짝",
  "최초",
  "압도",
  "돌풍",
  "위기",
  "충격",
];

const PR_TERMS = ["신제품", "프로모션", "이벤트", "할인", "체험단", "출시 기념"];

const NON_CULTURE_TERMS = [
  "트럼프",
  "대통령",
  "정부",
  "복지부",
  "국회",
  "의원",
  "선거",
  "관세",
  "정상외교",
  "지역발전",
  "한국 수출",
  "세계 5강",
  "공장 준공",
  "신사업장 준공",
  "의료기기",
  "생산라인",
  "경제자유구역",
  "첨단산업",
  "산업 유치",
  "국가산단",
  "코스피",
  "코스닥",
  "부동산",
];

const CATEGORY_TERMS: Record<string, string[]> = {
  kpop: [
    "K팝",
    "K-pop",
    "케이팝",
    "아이돌",
    "가수",
    "음악",
    "앨범",
    "신보",
    "컴백",
    "콘서트",
    "투어",
    "차트",
  ],
  screen: [
    "영화",
    "드라마",
    "OTT",
    "배우",
    "감독",
    "극장",
    "박스오피스",
    "넷플릭스",
    "신작",
    "개봉",
    "예매율",
    "칸",
  ],
  webtoon: ["웹툰", "웹소설", "작가", "네이버웹툰", "카카오웹툰"],
  beauty: ["뷰티", "화장품", "올리브영", "K-라이프스타일", "K뷰티", "스킨케어"],
  food: ["K푸드", "한식", "식품", "베이커리", "디저트", "맛집", "전통주", "비비고"],
  game: ["게임", "e스포츠", "LCK", "MSI", "리그 오브 레전드", "T1"],
  tech: ["AI", "로봇", "스타트업", "테크", "플랫폼", "네이버", "카카오"],
  stage: ["공연", "전시", "뮤지컬", "무대", "미술", "아트", "축제", "페스타"],
  heritage: ["전통문화", "문화재", "국악", "한복", "무형유산", "궁궐", "유산"],
  life: ["트렌드", "라이프", "핫플", "MZ", "유행", "여행", "관광", "브랜드"],
};

const MAX_ISSUES = 240;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[“”"'\[\]{}()<>·….,!?;:|/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  const normalized = normalizeText(text);
  const tokens = normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .filter((t) => !STOPWORDS.has(t));
  return new Set(tokens);
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function countTerms(text: string, terms: string[]): number {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function isRelevantCultureItem(item: NewsItem, text: string): boolean {
  if (hasAny(text, NON_CULTURE_TERMS)) return false;
  const terms = CATEGORY_TERMS[item.category] ?? [];
  if (terms.length === 0) return true;
  return hasAny(text, terms) || hasAny(text, MAJOR_TERMS);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function commonCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const t of a) if (b.has(t)) count++;
  return count;
}

function shouldCluster(candidate: Candidate, cluster: Cluster): boolean {
  if (candidate.item.category !== cluster.category) return false;
  const common = commonCount(candidate.tokens, cluster.tokens);
  const similarity = jaccard(candidate.tokens, cluster.tokens);
  if (common < 2 || similarity < 0.35) return false;
  return true;
}

function addToCluster(cluster: Cluster, candidate: Candidate): void {
  cluster.candidates.push(candidate);
  for (const t of candidate.tokens) cluster.tokens.add(t);
}

function choosePrimary(candidates: Candidate[]): Candidate {
  return [...candidates].sort((a, b) => {
    const aDate = new Date(a.item.pubDate).getTime() || 0;
    const bDate = new Date(b.item.pubDate).getTime() || 0;
    const aSignal = countTerms(a.text, [...IMPORTANCE_TERMS, ...IMPACT_TERMS]);
    const bSignal = countTerms(b.text, [...IMPORTANCE_TERMS, ...IMPACT_TERMS]);
    return bSignal - aSignal || bDate - aDate;
  })[0];
}

function scoreRecency(candidates: Candidate[], weekTo: string): number {
  const to = new Date(weekTo).getTime() || Date.now();
  const day = 24 * 3600 * 1000;
  const recentCount = candidates.filter((c) => {
    const t = new Date(c.item.pubDate).getTime();
    return !isNaN(t) && to - t <= 2 * day;
  }).length;
  const days = new Set(
    candidates
      .map((c) => {
        const t = new Date(c.item.pubDate);
        return isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10);
      })
      .filter(Boolean),
  ).size;
  return clamp((recentCount / candidates.length) * 65 + Math.min(days, 7) * 5);
}

function buildScores(cluster: Cluster, weekTo: string): IssueScores {
  const text = cluster.candidates.map((c) => c.text).join(" ");
  const sourceCount = cluster.candidates.length;
  const outletCount = new Set(cluster.candidates.map((c) => c.outlet).filter(Boolean)).size;
  const importanceHits = countTerms(text, IMPORTANCE_TERMS);
  const impactHits = countTerms(text, IMPACT_TERMS);
  const psychologicalHits = countTerms(text, PSYCHOLOGICAL_TERMS);
  const prHits = countTerms(text, PR_TERMS);
  const majorBoost = hasAny(text, MAJOR_TERMS) ? 12 : 0;

  const outletDiversityScore = Math.min(outletCount, 12) * 7;
  const sourceVolumeScore = Math.min(sourceCount, 20) * 3;
  const topicConcentrationScore = sourceCount > 1 ? 10 : 0;
  const interest = outletDiversityScore * 0.65 + sourceVolumeScore * 0.25 + topicConcentrationScore;
  const prPenalty = prHits >= 2 && outletCount <= 3 ? 18 : 0;

  return {
    importance: clamp(35 + importanceHits * 8 + majorBoost - prPenalty),
    impact: clamp(30 + impactHits * 8 + Math.min(outletCount, 10) * 2 + majorBoost / 2),
    interest: clamp(interest - prPenalty),
    psychological: clamp(20 + psychologicalHits * 7 - prPenalty),
    realtime: scoreRecency(cluster.candidates, weekTo),
  };
}

function totalScore(scores: IssueScores): number {
  // v1 heuristic weights: 첫 실주행 후 조정 가능.
  return clamp(
    scores.importance * 0.32 +
      scores.impact * 0.27 +
      scores.interest * 0.23 +
      scores.psychological * 0.08 +
      scores.realtime * 0.1,
  );
}

function summarize(cluster: Cluster): string {
  const primary = choosePrimary(cluster.candidates);
  return primary.item.description || primary.item.title;
}

function rationale(issue: Omit<AnalyzedIssue, "rationale">): string {
  const bits = [
    `${issue.sourceCount}개 기사`,
    `${issue.outletCount}개 매체`,
    `중요도 ${issue.scores.importance}`,
    `파급력 ${issue.scores.impact}`,
    `관심도 ${issue.scores.interest}`,
  ];
  return `${bits.join(" · ")} 기준으로 산정한 수집 뉴스 기반 우선순위 추정치입니다.`;
}

export function analyze(raw: RawNews): Analysis {
  const seenLinks = new Set<string>();
  const candidates: Candidate[] = [];
  raw.items.forEach((item, rawIndex) => {
    const link = item.originallink || item.link;
    if (!link || seenLinks.has(link) || shouldExclude(item.title)) return;
    const text = normalizeText(`${item.title} ${item.description}`);
    if (!isRelevantCultureItem(item, text)) return;
    seenLinks.add(link);
    candidates.push({
      rawIndex,
      item,
      link,
      outlet: outletFromUrl(link),
      text,
      tokens: tokenize(text),
    });
  });

  const clusters: Cluster[] = [];
  for (const candidate of candidates) {
    const cluster = clusters.find((c) => shouldCluster(candidate, c));
    if (cluster) {
      addToCluster(cluster, candidate);
    } else {
      clusters.push({
        category: candidate.item.category,
        candidates: [candidate],
        tokens: new Set(candidate.tokens),
      });
    }
  }

  const issues = clusters
    .map((cluster) => {
      const primary = choosePrimary(cluster.candidates);
      const outlets = [...new Set(cluster.candidates.map((c) => c.outlet).filter(Boolean))];
      const scores = buildScores(cluster, raw.weekRange.to);
      const base: Omit<AnalyzedIssue, "rank" | "rationale"> = {
        heading: primary.item.title,
        category: primary.item.category,
        summary: summarize(cluster),
        scores,
        score: totalScore(scores),
        sourceIndexes: cluster.candidates.map((c) => c.rawIndex),
        sourceCount: cluster.candidates.length,
        outletCount: outlets.length,
        outlets,
        primaryIndex: primary.rawIndex,
      };
      return {
        ...base,
        rank: 0,
        rationale: rationale({ ...base, rank: 0 }),
      };
    })
    .sort((a, b) => b.score - a.score || b.outletCount - a.outletCount)
    .slice(0, MAX_ISSUES)
    .map((issue, i) => ({ ...issue, rank: i + 1 }));

  return {
    analyzedAt: new Date().toISOString(),
    method: "local-heuristic-v1",
    note: "외부 검색량/SNS 반응이 아닌 수집 뉴스 기반 우선순위 추정치입니다.",
    issues,
  };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const raw = readJson<RawNews>(path.join(tmpDir(slug), "raw-news.json"));
  const out = path.join(tmpDir(slug), "analysis.json");
  writeJson(out, analyze(raw));
  console.log(`✅ 우선순위 분석 완료 → ${out}`);
}
