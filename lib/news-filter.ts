// 저가치 기사(화보·일상 사진·단순 출연/근황 등) 사전 필터.
// 큐레이션(claude) 전에 명백한 스팸을 코드로 걸러 후보 풀 품질을 높인다.

const LOW_VALUE_PATTERNS: RegExp[] = [
  // 대괄호 태그형
  /\[(포토|화보|직캠|움짤|포토뉴스|영상|N샷|독점)\]/,
  // 연예 화보·외모 묘사
  /(자태|미모|비주얼|청순미|시크함|각선미|뒤태|옆태|셀카|셀피|움짤|글래머|볼륨감)/,
  // 사진 포착류
  /(포착|눈길|시선\s*강탈|한\s?컷|미소\s*(발산|만개)|뽐내|뽐낸|뽐|매력\s*발산|물오른)/,
  // 패션/공항/일상
  /(\s룩[\s…)]|데일리룩|공항\s*패션|출국(길)?|입국(장)?|나들이|일상\s*공개)/,
];

export function isLowValueTitle(title: string): boolean {
  if (!title) return true;
  return LOW_VALUE_PATTERNS.some((re) => re.test(title));
}

// 문화와 무관한 기사(정치·선거·경제·사건사고) — 키워드 충돌로 섞여 들어옴
const NON_CULTURE_PATTERNS: RegExp[] = [
  /(공약|선거|출마|후보\s*등록|국회|의원|장관|대통령실|여야|민주당|국민의힘|시장\s*후보|도지사)/,
  /(코스피|코스닥|증시|환율|금리\s|부동산|분양|아파트값|주가)/,
  /(기소|구속|혐의|징역|벌금형|입건|압수수색)/,
];
export function isNonCulture(title: string): boolean {
  if (!title) return false;
  return NON_CULTURE_PATTERNS.some((re) => re.test(title));
}

/** 후보 풀에서 제외할 기사인지 (저가치 OR 비문화) */
export function shouldExclude(title: string): boolean {
  return isLowValueTitle(title) || isNonCulture(title);
}

/** 뉴스 항목 배열에서 제외 대상 제거 */
export function filterLowValue<T extends { title: string }>(items: T[]): T[] {
  return items.filter((it) => !shouldExclude(it.title));
}
