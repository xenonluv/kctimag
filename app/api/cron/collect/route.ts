// 일일 뉴스 수집 (Vercel Cron, 하루 1회) — Naver에서 그날치 문화 뉴스를 받아 news_raw에 누적.
// LLM 불필요·순수 API라 서버리스에서 가볍게 동작(SMTP·claude 무관).
import { NextRequest, NextResponse } from "next/server";
import { CULTURE_CATEGORIES } from "@/lib/categories";
import { searchNews, cleanHtml, toISO, sleep } from "@/lib/naver";
import { upsertNews, pruneOldNews } from "@/lib/news-store";
import { getEnv } from "@/lib/env";
import type { NewsItem } from "@/types/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel 함수 타임아웃(초)

export async function GET(req: NextRequest) {
  // Vercel Cron은 CRON_SECRET 설정 시 Authorization: Bearer <CRON_SECRET> 헤더를 보냄
  const secret = getEnv("CRON_SECRET");
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const cutoff = Date.now() - 2 * 24 * 3600 * 1000; // 최근 ~2일
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const cat of CULTURE_CATEGORIES) {
    for (const q of cat.queries) {
      let raws;
      try {
        raws = await searchNews(q, { display: 30, sort: "date" });
      } catch {
        continue;
      }
      await sleep(120); // 네이버 QPS 회피
      for (const r of raws) {
        const link = r.originallink || r.link;
        if (!link || seen.has(link)) continue;
        const iso = toISO(r.pubDate);
        const ms = new Date(iso).getTime();
        if (!isNaN(ms) && ms < cutoff) continue;
        seen.add(link);
        items.push({
          title: cleanHtml(r.title),
          description: cleanHtml(r.description),
          link,
          originallink: r.originallink,
          pubDate: iso,
          category: cat.key,
          categoryLabel: cat.label,
        });
      }
    }
  }

  let inserted = 0;
  try {
    inserted = await upsertNews(items);
    await pruneOldNews(14);
  } catch (e) {
    return NextResponse.json(
      { collected: items.length, error: (e as Error).message },
      { status: 500 },
    );
  }
  return NextResponse.json({ collected: items.length, upserted: inserted });
}
