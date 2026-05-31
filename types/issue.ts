// 매거진 1호(issue)의 구조화 데이터 모델.
// 파이프라인이 생성 → content/issues/{slug}/issue.json 으로 커밋 → 웹/PDF가 렌더.
//
// MDX 대신 구조화 JSON을 쓰는 이유: 계층형 이미지 정책상 이미지별 메타데이터
// (출처·라이선스·캡션·AI라벨·출처링크)를 일관되게 강제·렌더해야 하기 때문.
// 본문 산문은 Markdown 문자열로 두어 표현 자유도를 확보한다.

/** 이미지 출처 종류 (계층형 이미지 정책) */
export type ImageSourceKind =
  | "stock" // Pexels/Unsplash 등 무료 스톡
  | "wikimedia" // Wikimedia Commons CC/퍼블릭도메인 (실존 인물·장소·사건)
  | "ai" // Google Gemini / Pollinations 무료 AI 생성 (개념·추상)
  | "link"; // 합법 임베드 이미지 없음 → 원문 기사 링크만

export interface ImageAsset {
  /** 표시할 이미지 URL. kind === "link" 이면 빈 문자열 가능(sourceLink 사용). */
  url: string;
  kind: ImageSourceKind;
  /** 캡션 (한국어) */
  caption: string;
  /** 저작자/출처 표기 (예: "사진: Wikimedia Commons / 홍길동") */
  attribution?: string;
  /** 라이선스 (예: "CC BY-SA 4.0", "Pexels License", "AI-generated") */
  license?: string;
  /** AI 생성 여부 → UI에 "AI 생성 이미지" 라벨 표기 (오정보 방지) */
  isAI: boolean;
  /** kind === "link" 일 때 원문 기사/출처 링크 */
  sourceLink?: string;
  /** 접근성 alt 텍스트 */
  alt: string;
}

/** 근거 기사 출처 */
export interface SourceRef {
  title: string;
  link: string;
  pubDate?: string;
}

/** 이슈 섹션 (상위 이슈 1건 = 1섹션) */
export interface IssueSection {
  id: string;
  /** 섹션 제목 */
  heading: string;
  /** 이슈 순위 (1 = 최상위) */
  rank: number;
  /** 4대 강도 분석 (0-100) */
  intensities: {
    news: number; // 뉴스강도: 보도 빈도/규모
    psychological: number; // 심리강도: 감성/공감 강도
    realtime: number; // 실시간강도: 최신성/확산 속도
  };
  /** 문화 카테고리 라벨 */
  category: string;
  /** 본문 (Markdown) */
  bodyMarkdown: string;
  /** 인용구(선택) */
  pullQuote?: string;
  /** 섹션 이미지들 */
  images: ImageAsset[];
  /** 근거 기사 출처 */
  sources: SourceRef[];
}

/** 호 메타데이터 */
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
  /** 표지 이미지 */
  coverImage: ImageAsset;
  /** 발행 후 채워지는 Supabase Storage PDF URL */
  pdfUrl?: string;
}

/** 팀장(편집장) 총평 */
export interface Editorial {
  title: string;
  /** 향후 영향 / 문제점 / 긍정 요소 종합 (Markdown) */
  bodyMarkdown: string;
  author: string; // 예: "편집장"
}

/** 매거진 1호 전체 */
export interface Issue {
  meta: IssueMeta;
  sections: IssueSection[];
  editorial: Editorial;
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
