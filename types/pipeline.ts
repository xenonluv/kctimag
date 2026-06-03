// 파이프라인 단계 간 주고받는 중간 산출물 타입.

/** 팀원1 수집 결과의 개별 뉴스 항목 */
export interface NewsItem {
  /** HTML 태그 제거된 제목 */
  title: string;
  /** 요약 스니펫 (네이버 검색 API description) */
  description: string;
  /** 네이버 링크 */
  link: string;
  /** 원문 링크 */
  originallink?: string;
  /** 발행일 ISO */
  pubDate: string;
  /** 수집 시 부여한 문화 카테고리 key */
  category: string;
  /** 카테고리 라벨 */
  categoryLabel: string;
}

/** 팀원1 수집 결과 전체 (raw-news.json) */
export interface RawNews {
  collectedAt: string;
  weekRange: { from: string; to: string };
  totalCount: number;
  items: NewsItem[];
}

/** 수집 뉴스 기반 우선순위 추정 점수(0-100) */
export interface IssueScores {
  importance: number;
  impact: number;
  interest: number;
  psychological: number;
  realtime: number;
}

/** 팀원2 분석: 이슈 1건 */
export interface AnalyzedIssue {
  rank: number;
  heading: string;
  category: string;
  summary: string;
  scores: IssueScores;
  /** 종합 점수 0-100. 실제 검색량/SNS가 아닌 수집 뉴스 기반 추정치 */
  score: number;
  rationale: string;
  /** raw.items 원본 배열에서 근거 기사 인덱스 */
  sourceIndexes: number[];
  sourceCount: number;
  outletCount: number;
  outlets: string[];
  /** raw.items 원본 배열의 대표 기사 인덱스 */
  primaryIndex: number;
}

/** 팀원2 분석 결과 (analysis.json) */
export interface Analysis {
  analyzedAt: string;
  method: "local-heuristic-v1";
  note: string;
  issues: AnalyzedIssue[];
}

/** 팀원4 이미지 계획: 섹션별 이미지 슬롯 1개 */
export interface ImagePlan {
  sectionId: string;
  /** 이미지 성격 → 소스 선택의 근거 */
  intent: "stock" | "wikimedia" | "ai" | "link";
  /** 스톡/위키미디어 검색어 또는 AI 생성 프롬프트 */
  query: string;
  caption: string;
  alt: string;
  /** link 의도일 때 사용할 출처 기사 링크 */
  sourceLink?: string;
}

/** CEO 게이트 검증 결과 */
export interface GateResult {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  approvedAt?: string;
}
