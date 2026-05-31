// Wikimedia Commons — 실존 인물·장소·사건의 CC/퍼블릭도메인 이미지 (사실 + 합법).
// 키 불필요. Wikimedia 정책상 식별 가능한 User-Agent 필수.

export interface WikiResult {
  url: string;
  attribution: string;
  license: string;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function searchWikimedia(query: string): Promise<WikiResult | null> {
  try {
    const api =
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
      `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8` +
      `&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1000&format=json&origin=*`;
    const res = await fetch(api, {
      headers: {
        "User-Agent":
          "kctimag/1.0 (weekly Korean culture magazine; xenonluv@gist.ac.kr)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            imageinfo?: {
              url?: string;
              thumburl?: string;
              extmetadata?: Record<string, { value?: string }>;
            }[];
          }
        >;
      };
    };
    const pages = data.query?.pages;
    if (!pages) return null;

    for (const k of Object.keys(pages)) {
      const info = pages[k].imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata ?? {};
      const license = (meta.LicenseShortName?.value ?? "").toString();
      // 자유 라이선스만 허용
      if (!/CC|Public domain|PD|CC0/i.test(license)) continue;
      const url = info.thumburl || info.url;
      if (!url) continue;
      const artist = stripTags(meta.Artist?.value ?? "");
      return {
        url,
        attribution: `사진: Wikimedia Commons${artist ? " / " + artist : ""}`,
        license: license || "CC",
      };
    }
    return null;
  } catch {
    return null;
  }
}
