// Pexels — 무료 스톡 이미지 (분위기·배경용). PEXELS_API_KEY 필요.
import { getEnv } from "@/lib/env";

export interface StockResult {
  url: string;
  attribution: string;
}

export async function searchPexels(
  query: string,
  size?: { w: number; h: number },
): Promise<StockResult | null> {
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
    // 표시 크기에 맞춘 압축본(원본은 수 MB) — PDF 용량↓. 카드 기본 600×400, 호출부에서 크기 지정 가능.
    const w = size?.w ?? 600;
    const h = size?.h ?? 400;
    const url = base
      ? `${base}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`
      : p?.src?.large;
    if (!url) return null;
    return { url, attribution: `사진: ${p?.photographer ?? "Pexels"} / Pexels` };
  } catch {
    return null;
  }
}
