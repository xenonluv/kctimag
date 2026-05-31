// 기사 자체 이미지(og:image) 추출 — 사용자 지침: 기사에 실린 이미지를 우선 사용하고 출처만 표기.
import { searchPexels } from "@/lib/images/pexels";

/** 기사 URL → og:image(또는 twitter:image) URL. 실패 시 null. */
export async function fetchOgImage(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; kctimag/1.0; +https://kctimag.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000); // head 영역이면 충분
    const m =
      html.match(
        /<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      ) ||
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      );
    if (!m) return null;
    let img = m[1].trim().replace(/&amp;/g, "&");
    if (img.startsWith("//")) img = "https:" + img;
    if (!/^https?:\/\//.test(img)) return null;
    return img;
  } catch {
    return null;
  }
}

/** URL → 언론사(호스트명) 추정 */
export function outletFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").replace(/^n\.news\./, "");
  } catch {
    return "";
  }
}

/** 기사 이미지가 없을 때 카테고리 키워드로 스톡 폴백 */
export async function stockFallback(
  query: string,
): Promise<{ url: string; source: string } | null> {
  const s = await searchPexels(query);
  if (!s) return null;
  return { url: s.url, source: s.attribution };
}
