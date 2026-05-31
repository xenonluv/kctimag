// Pexels — 무료 스톡 이미지 (분위기·배경용). PEXELS_API_KEY 필요.
import { getEnv } from "@/lib/env";

export interface StockResult {
  url: string;
  attribution: string;
}

export async function searchPexels(query: string): Promise<StockResult | null> {
  const key = getEnv("PEXELS_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query,
      )}&per_page=1&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: { src?: { large?: string; original?: string }; photographer?: string }[];
    };
    const p = data.photos?.[0];
    const url = p?.src?.large ?? p?.src?.original;
    if (!url) return null;
    return { url, attribution: `사진: ${p?.photographer ?? "Pexels"} / Pexels` };
  } catch {
    return null;
  }
}
