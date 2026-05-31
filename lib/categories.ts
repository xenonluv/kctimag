// 팀원1(수집)이 사용하는 한국 문화 카테고리와 네이버 검색 쿼리 셋.
// "문화"를 넓게 — 대중문화·라이프·테크·푸드·트렌드까지 포함.

export interface CultureCategory {
  key: string;
  label: string;
  /** 네이버 뉴스 검색 쿼리들 */
  queries: string[];
}

export const CULTURE_CATEGORIES: CultureCategory[] = [
  {
    key: "kpop",
    label: "K-pop·음악",
    queries: ["K팝", "아이돌 컴백", "가요 신곡", "콘서트 투어"],
  },
  {
    key: "screen",
    label: "K-드라마·영화",
    queries: ["한국 드라마", "OTT 드라마", "한국 영화", "박스오피스"],
  },
  {
    key: "webtoon",
    label: "웹툰·웹소설",
    queries: ["웹툰", "웹소설", "웹툰 드라마화", "네이버웹툰"],
  },
  {
    key: "beauty",
    label: "K-뷰티",
    queries: ["K뷰티", "화장품 신제품", "뷰티 트렌드", "K뷰티 수출"],
  },
  {
    key: "food",
    label: "K-푸드·맛집",
    queries: ["K푸드", "한식 세계화", "맛집 트렌드", "전통주", "디저트 유행"],
  },
  {
    key: "game",
    label: "K-게임·e스포츠",
    queries: ["한국 게임 출시", "e스포츠", "게임 업데이트", "롤 LCK"],
  },
  {
    key: "tech",
    label: "K-테크·로봇",
    queries: ["로봇 기술", "AI 한국", "한국 스타트업", "K테크 혁신"],
  },
  {
    key: "stage",
    label: "공연·전시·예술",
    queries: ["뮤지컬", "전시회", "공연 무대", "미술관 전시"],
  },
  {
    key: "heritage",
    label: "전통문화",
    queries: ["전통문화", "문화재", "국악", "한복", "무형유산"],
  },
  {
    key: "life",
    label: "라이프·트렌드",
    queries: ["MZ 트렌드", "핫플레이스", "동네 맛집", "라이프스타일 유행", "인싸"],
  },
];
