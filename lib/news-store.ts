// news_raw 누적 저장소 — 매일 수집분을 Supabase에 누적, 주간 분석이 최근 N일 조회.
import { getAdminSupabase } from "@/lib/supabase";
import type { NewsItem } from "@/types/pipeline";

interface NewsRow {
  link: string;
  title: string | null;
  description: string | null;
  pub_date: string | null;
  category: string | null;
  category_label: string | null;
}

function rowToItem(r: NewsRow): NewsItem {
  return {
    title: r.title ?? "",
    description: r.description ?? "",
    link: r.link,
    pubDate: r.pub_date ?? "",
    category: r.category ?? "",
    categoryLabel: r.category_label ?? "",
  };
}

/** 수집분 upsert (link 중복 무시). 반환: 시도 건수 */
export async function upsertNews(items: NewsItem[]): Promise<number> {
  const sb = getAdminSupabase();
  if (!sb || items.length === 0) return 0;
  const rows = items.map((it) => ({
    link: it.link,
    title: it.title,
    description: it.description,
    pub_date: it.pubDate || null,
    category: it.category,
    category_label: it.categoryLabel,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb
      .from("news_raw")
      .upsert(chunk, { onConflict: "link", ignoreDuplicates: true });
    if (error) throw new Error(`news_raw upsert 실패: ${error.message}`);
  }
  return items.length;
}

/** 최근 days일 누적 뉴스 조회 */
export async function getRecentNews(days = 7, limit = 2000): Promise<NewsItem[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb
    .from("news_raw")
    .select("link,title,description,pub_date,category,category_label")
    .gte("pub_date", since)
    .order("pub_date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`news_raw 조회 실패: ${error.message}`);
  return ((data as NewsRow[]) ?? []).map(rowToItem);
}

/** 오래된 행 정리 (무료 한도 유지) */
export async function pruneOldNews(days = 14): Promise<void> {
  const sb = getAdminSupabase();
  if (!sb) return;
  const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  await sb.from("news_raw").delete().lt("pub_date", cutoff);
}
