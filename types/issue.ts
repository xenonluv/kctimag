// 매거진 1호(issue) = "큐레이션 뉴스 다이제스트 + 편집장 픽".
// 파이프라인이 생성 → content/issues/{slug}/issue.json 으로 커밋 → 웹/PDF가 렌더.
import type { IssueScores } from "@/types/pipeline";

export interface NewsPriorityAnalysis {
  rank: number;
  score: number;
  scores: IssueScores;
  rationale: string;
  sourceCount: number;
  outletCount: number;
}

/** 기사에 실린 이미지(og:image). 출처(언론사)만 표기. */
export interface EntryImage {
  url: string;
  /** 출처 표기 (예: "사진: 〇〇일보") */
  source: string;
}

/** 개별 문화뉴스 항목 */
export interface NewsEntry {
  /** 기사 제목 (클릭 → 원문) */
  headline: string;
  /** 원문 기사 링크 */
  link: string;
  /** 언론사/출처 */
  outlet?: string;
  /** 발행일 ISO */
  pubDate?: string;
  /** 1~2줄 설명 */
  blurb?: string;
  /** 이미지 (레이어드: Wikimedia/Pexels/AI) */
  image?: EntryImage;
  /** AI 이미지 생성용 프롬프트 (내부용, 렌더 안 함) */
  imagePrompt?: string;
  /** 스톡/위키 사진 검색용 키워드 (내부용, 렌더 안 함) */
  imageQuery?: string;
  /** 수집 뉴스 기반 우선순위 추정치 */
  analysis?: NewsPriorityAnalysis;
}

/** 카테고리(부서)별 뉴스 목록 */
export interface CategorySection {
  key: string;
  label: string;
  entries: NewsEntry[];
  /** 이번 주 이 카테고리에서 이 뉴스들을 고른 이유(큐레이터 코멘트) */
  note?: string;
}

/** 편집장 픽 — 이번 주 최대 이슈 1건 + 선정 이유 */
export interface EditorPick {
  headline: string;
  link: string;
  /** 왜 이번 주 가장 큰 이슈로 채택했는지 */
  why: string;
  image?: EntryImage;
  imagePrompt?: string;
  imageQuery?: string;
  outlet?: string;
  /** 수집 뉴스 기반 우선순위 추정치 */
  analysis?: NewsPriorityAnalysis;
  /** 함께 주목할 기사(선택) */
  honorableMentions?: { headline: string; link: string }[];
}

export interface IssueMeta {
  /** "2026-06-01" 형식 슬러그(=URL) */
  slug: string;
  /** 호 제목 */
  title: string;
  /** 부제/요약 (1-2문장) */
  dek: string;
  /** 발행일 ISO date */
  date: string;
  /** 다룬 주간 범위 */
  weekRange: { from: string; to: string };
  /** 표지 이미지 URL(보통 편집장 픽 기사 이미지) */
  coverImageUrl?: string;
  /** 매주 바뀌는 은은한 포스트모던 배경 이미지 URL */
  backgroundImageUrl?: string;
  /** 발행 후 채워지는 Supabase Storage PDF URL */
  pdfUrl?: string;
  /** 큐레이션 규모(자랑용): AI가 분석한 전체 풀 + 엄선 결과 */
  curation?: {
    /** 분석한 전체 기사 수 */
    scanned: number;
    /** 카드로 엄선된 항목 수 */
    selected: number;
    /** 수집 카테고리별 기사 수(많은 순) */
    breakdown: { label: string; count: number }[];
    /** 이번 주 선정 이유(홈 배너, 3문장 내외) */
    rationale?: string;
  };
  /** 수집 뉴스 기반 우선순위 분석 메타 */
  analysis?: {
    method: "local-heuristic-v1";
    note: string;
    issueCount: number;
  };
}

/** 편집장 총평 — 이번 주 문화 흐름 전반을 짚는 글 */
export interface EditorialNote {
  title: string;
  /** 본문 (Markdown) */
  bodyMarkdown: string;
}

/** 매거진 1호 전체 (다이제스트) */
export interface Issue {
  meta: IssueMeta;
  /** 편집장 픽 — 이번 주 최대 이슈 1건 */
  editorPick: EditorPick;
  /** 편집장 총평 — 이번 주 흐름 */
  editorial?: EditorialNote;
  categories: CategorySection[];
  /** 생성 타임스탬프 ISO */
  generatedAt: string;
}

/** content/issues 인덱스 항목 (목록 페이지용 경량 메타) */
export interface IssueIndexEntry {
  slug: string;
  title: string;
  dek: string;
  date: string;
  coverImageUrl: string;
}
