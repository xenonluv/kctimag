// 네이버 검색 API 클라이언트 (팀원1 뉴스 수집).
// 무료 한도: 25,000 호출/일. 인증: X-Naver-Client-Id / X-Naver-Client-Secret 헤더.
import { requireEnv } from "@/lib/env";

const NEWS_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";

export interface NaverNewsRaw {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string; // RFC822: "Mon, 26 May 2026 10:00:00 +0900"
}

export interface NaverNewsResponse {
  total: number;
  start: number;
  display: number;
  items: NaverNewsRaw[];
}

export interface SearchOptions {
  display?: number; // 1-100 (기본 50)
  start?: number; // 1-1000
  sort?: "sim" | "date"; // date=최신순
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function searchNews(
  query: string,
  opts: SearchOptions = {},
  retries = 3,
): Promise<NaverNewsRaw[]> {
  const id = requireEnv("NAVER_CLIENT_ID");
  const secret = requireEnv("NAVER_CLIENT_SECRET");

  const url = new URL(NEWS_ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(Math.min(opts.display ?? 50, 100)));
  url.searchParams.set("start", String(opts.start ?? 1));
  url.searchParams.set("sort", opts.sort ?? "date");

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": id,
      "X-Naver-Client-Secret": secret,
    },
  });

  // 429(속도 제한) → backoff 후 재시도
  if (res.status === 429 && retries > 0) {
    await sleep(1500 * (4 - retries));
    return searchNews(query, opts, retries - 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Naver API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as NaverNewsResponse;
  return data.items ?? [];
}

/** 네이버 응답의 HTML 태그/엔티티 제거 */
export function cleanHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** RFC822 pubDate → ISO 문자열 (파싱 실패 시 원본 반환) */
export function toISO(pubDate: string): string {
  const d = new Date(pubDate);
  return isNaN(d.getTime()) ? pubDate : d.toISOString();
}
