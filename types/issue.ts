// 매거진 1호(issue) = "큐레이션 뉴스 다이제스트 + 편집장 픽".
// 파이프라인이 생성 → content/issues/{slug}/issue.json 으로 커밋 → 웹/PDF가 렌더.

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
  /** 기사 자체 이미지(og:image) */
  image?: EntryImage;
}

/** 카테고리(부서)별 뉴스 목록 */
export interface CategorySection {
  key: string;
  label: string;
  entries: NewsEntry[];
}

/** 편집장 픽 — 이번 주 최대 이슈 1건 + 선정 이유 */
export interface EditorPick {
  headline: string;
  link: string;
  /** 왜 이번 주 가장 큰 이슈로 채택했는지 */
  why: string;
  image?: EntryImage;
  outlet?: string;
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
  /** 발행 후 채워지는 Supabase Storage PDF URL */
  pdfUrl?: string;
}

/** 매거진 1호 전체 (다이제스트) */
export interface Issue {
  meta: IssueMeta;
  editorPick: EditorPick;
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
