// 특별기획 = "특정 주제 하나를 깊이 파고든 장문의 논평/기획 기사".
// 대화식으로 집필 → content/special/{slug}/article.json 으로 커밋 → 웹이 렌더.

/** 본문 하단 "참고한 뉴스" 각주 항목 (선택) */
export interface SpecialSource {
  headline: string;
  outlet?: string;
  link: string;
  /** 왜 참고했는지(선택) */
  note?: string;
}

export interface SpecialMeta {
  /** "2026-07-01" 형식 슬러그(=URL) */
  slug: string;
  /** 상단 배지 문구 (예: "특별기획") */
  kicker?: string;
  /** 기사 제목 */
  title: string;
  /** 부제/요약 (1-2문장) */
  dek: string;
  /** 발행일 ISO date */
  date: string;
  /** 표지 이미지 URL(선택) */
  coverImageUrl?: string;
  /** 은은한 배경 이미지 URL(선택) */
  backgroundImageUrl?: string;
}

/** 특별기획 기사 전체 */
export interface SpecialArticle {
  meta: SpecialMeta;
  /** 본문 (Markdown) */
  bodyMarkdown: string;
  /** 참고한 뉴스 각주(선택) */
  sources?: SpecialSource[];
  /** 필자 표기(선택) */
  author?: string;
  /** 생성 타임스탬프 ISO */
  generatedAt: string;
}

/** content/special 인덱스 항목 (목록/노출용 경량 메타) */
export interface SpecialIndexEntry {
  slug: string;
  title: string;
  dek: string;
  date: string;
  kicker: string;
  coverImageUrl: string;
}
