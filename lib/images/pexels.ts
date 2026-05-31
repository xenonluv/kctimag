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
    const base = p?.src?.original;
    // 카드용으로 900×600 압축본(원본은 수 MB라 로드 부하) — Pexels CDN 리사이즈 파라미터.
    const url = base
      ? `${base}?auto=compress&cs=tinysrgb&fit=crop&w=900&h=600`
      : p?.src?.large;
    if (!url) return null;
    return { url, attribution: `사진: ${p?.photographer ?? "Pexels"} / Pexels` };
  } catch {
    return null;
  }
}
