import "@/lib/load-env";
import { eventJsonPath, writeJson } from "@/lib/paths";
import { collectEvents } from "./01-collect-events";
import { analyzeEvents, emptyEventsDoc } from "./02-analyze-events";
import { todaySlug } from "./date-utils";

const slug = process.argv[2] || todaySlug();

async function main() {
  console.log(`\n🎭 문화 이벤트 파이프라인 — ${slug}\n`);
  try {
    console.log("① 이벤트 수집 (TourAPI + 뉴스)");
    const raw = await collectEvents(slug);
    console.log(`   후보 ${raw.totalCount}건\n`);

    console.log("② 이벤트 분석 (기간 필터 + 중요도 정렬)");
    const doc = analyzeEvents(raw);
    console.log(`   최종 ${doc.events.length}건 → content/events/${slug}/events.json\n`);
  } catch (e) {
    const reason = `이벤트 수집/분석 실패: ${(e as Error).message}`;
    console.warn(`⚠️ ${reason}`);
    const fallback = emptyEventsDoc(slug, reason);
    writeJson(eventJsonPath(slug), fallback);
    console.warn(`   빈 이벤트 문서 생성 → content/events/${slug}/events.json\n`);
  }
}

main().catch((e) => {
  console.error("events pipeline failed:", e);
  process.exit(1);
});
