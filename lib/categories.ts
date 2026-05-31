// 팀원1(수집)이 사용하는 한국 문화 10개 카테고리와 네이버 검색 쿼리 셋.

export interface CultureCategory {
  key: string;
  label: string;
  /** 네이버 뉴스 검색에 사용할 쿼리들 */
  queries: string[];
}

export const CULTURE_CATEGORIES: CultureCategory[] = [
  {
    key: "kpop",
    label: "K-pop·음악",
    queries: ["K팝", "아이돌 컴백", "가요", "음반 발매", "콘서트"],
  },
  {
    key: "film",
    label: "영화",
    queries: ["한국 영화", "박스오피스", "영화제", "영화 개봉"],
  },
  {
    key: "drama",
    label: "드라마·예능",
    queries: ["한국 드라마", "OTT 드라마", "예능 프로그램", "방송 화제"],
  },
  {
    key: "stage",
    label: "공연·연극",
    queries: ["뮤지컬", "연극", "공연 무대", "오페라"],
  },
  {
    key: "art",
    label: "전시·미술",
    queries: ["전시회", "미술관", "비엔날레", "갤러리 전시"],
  },
  {
    key: "literature",
    label: "문학·출판",
    queries: ["한국 문학", "소설 출간", "베스트셀러", "문학상"],
  },
  {
    key: "heritage",
    label: "전통문화·유산",
    queries: ["전통문화", "문화재", "국악", "무형유산", "한복"],
  },
  {
    key: "festival",
    label: "축제",
    queries: ["문화 축제", "지역 축제", "페스티벌"],
  },
  {
    key: "game",
    label: "게임·웹툰",
    queries: ["웹툰", "게임 출시", "e스포츠"],
  },
  {
    key: "food",
    label: "푸드·라이프",
    queries: ["한식 트렌드", "전통주", "라이프스타일 문화"],
  },
];
