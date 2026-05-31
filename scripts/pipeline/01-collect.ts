// 팀원1 — Collector (뉴스 수집)
// 네이버 검색 API로 한국 문화 10개 카테고리 × 최근 7일 뉴스를 수집·중복제거.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { subDays } from "date-fns";
import { CULTURE_CATEGORIES } from "@/lib/categories";
import { searchNews, cleanHtml, toISO, sleep } from "@/lib/naver";
import { shouldExclude } from "@/lib/news-filter";
import { writeJson, tmpDir } from "@/lib/paths";
import type { NewsItem, RawNews } from "@/types/pipeline";

function weekRange(now: Date) {
  return { from: subDays(now, 7).toISOString(), to: now.toISOString() };
}

export async function collect(now: Date = new Date()): Promise<RawNews> {
  const range = weekRange(now);
  const fromMs = new Date(range.from).getTime();
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const cat of CULTURE_CATEGORIES) {
    for (const q of cat.queries) {
      let raws;
      try {
        raws = await searchNews(q, { display: 100, sort: "date" });
      } catch (e) {
        console.error(`  [warn] "${q}" 검색 실패: ${(e as Error).message}`);
        continue;
      }
      await sleep(250); // 네이버 초당 호출 제한(~10 QPS) 회피용 throttle
      for (const r of raws) {
        const link = r.originallink || r.link;
        if (!link || seen.has(link)) continue;
        const iso = toISO(r.pubDate);
        const ms = new Date(iso).getTime();
        if (!isNaN(ms) && ms < fromMs) continue; // 최근 7일 이전 제외
        const title = cleanHtml(r.title);
        if (shouldExclude(title)) continue; // 화보·일상사진·정치·경제 등 제외
        seen.add(link);
        items.push({
          title,
          description: cleanHtml(r.description),
          link,
          originallink: r.originallink,
          pubDate: iso,
          category: cat.key,
          categoryLabel: cat.label,
        });
      }
    }
    console.log(`  ${cat.label}: 누적 ${items.length}건`);
  }

  items.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return {
    collectedAt: new Date().toISOString(),
    weekRange: range,
    totalCount: items.length,
    items,
  };
}

// ── CLI 직접 실행 ──
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  collect()
    .then((r) => {
      const out = path.join(tmpDir(slug), "raw-news.json");
      writeJson(out, r);
      console.log(`\n✅ 수집 완료: ${r.totalCount}건 → ${out}`);
    })
    .catch((e) => {
      console.error("❌ 수집 실패:", e);
      process.exit(1);
    });
}
