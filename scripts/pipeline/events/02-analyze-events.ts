import "@/lib/load-env";
import { existsSync } from "node:fs";
import { eventJsonPath, readJson, tmpDir, writeJson } from "@/lib/paths";
import type {
  CultureEvent,
  EventCategory,
  EventScores,
  EventSourceRef,
  EventsDoc,
} from "@/types/event";
import {
  addSlugDays,
  fromCompactDate,
  inDisplayRange,
  todaySlug,
} from "./date-utils";
import type { RawEventCandidate, RawEvents } from "./01-collect-events";

const MAJOR_TERMS = [
  "BTS",
  "방탄소년단",
  "블랙핑크",
  "뉴진스",
  "세븐틴",
  "스트레이 키즈",
  "아이브",
  "르세라핌",
  "월드투어",
  "국제",
  "비엔날레",
  "아트페어",
  "국립",
];

const NEWS_MAJOR_TERMS = [
  "BTS",
  "방탄소년단",
  "블랙핑크",
  "뉴진스",
  "세븐틴",
  "스트레이 키즈",
  "아이브",
  "르세라핌",
  "월드투어",
];

function stripHtml(text = ""): string {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeTitle(title: string): string {
  return stripHtml(title)
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function eventId(title: string, startDate: string, region = ""): string {
  const key = `${normalizeTitle(title)}-${startDate}-${region}`;
  return key
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function sourceFromCandidate(candidate: RawEventCandidate): EventSourceRef {
  return {
    type: candidate.sourceType,
    title: candidate.title,
    url: candidate.url,
    outlet: candidate.outlet,
    pubDate: candidate.pubDate,
    contentId: candidate.contentId,
  };
}

function categoryFor(text: string): EventCategory {
  if (/콘서트|팬미팅|월드투어|K팝|아이돌|BTS|블랙핑크|세븐틴/.test(text)) {
    return "concert";
  }
  if (/영화제|시사회|상영회/.test(text)) return "film";
  if (/전시|특별전|미술관|박물관|아트페어|비엔날레/.test(text)) {
    return "exhibition";
  }
  if (/뮤지컬|연극|무용|클래식|오페라/.test(text)) return "performance";
  if (/e스포츠|게임대회|게임쇼|LCK|결승/.test(text)) return "esports";
  if (/팝업|팝업스토어/.test(text)) return "popup";
  if (/국가유산|문화유산|궁궐|전통|야행/.test(text)) return "heritage";
  if (/축제|페스티벌|문화제/.test(text)) return "festival";
  return "other";
}

function extractNewsDate(candidate: RawEventCandidate, baseYear: string): string | undefined {
  const text = `${candidate.title} ${candidate.description ?? ""}`;
  const full = text.match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (full) {
    if (isTicketDate(text, full.index ?? 0)) return undefined;
    return `${full[1]}-${full[2].padStart(2, "0")}-${full[3].padStart(2, "0")}`;
  }
  const short = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (short) {
    if (isTicketDate(text, short.index ?? 0)) return undefined;
    return `${baseYear}-${short[1].padStart(2, "0")}-${short[2].padStart(2, "0")}`;
  }
  const iso = text.match(/(20\d{2})[.-](\d{1,2})[.-](\d{1,2})/);
  if (iso) {
    if (isTicketDate(text, iso.index ?? 0)) return undefined;
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }
  return undefined;
}

function isTicketDate(text: string, index: number): boolean {
  const context = text.slice(Math.max(0, index - 24), index + 40);
  return /예매|티켓|판매|예약|접수|모집/.test(context);
}

function isStrongNewsEvent(candidate: RawEventCandidate): boolean {
  const text = `${candidate.title} ${candidate.description ?? ""}`;
  return /콘서트|공연|팬미팅|월드투어|축제|페스티벌|영화제|전시|특별전|미술관|박물관|뮤지컬|연극|오페라|클래식|팝업스토어|e스포츠|게임쇼/.test(
    text,
  );
}

function datesFor(candidate: RawEventCandidate, slug: string) {
  if (candidate.sourceType === "tour-api") {
    const start = fromCompactDate(candidate.startDate);
    const end = fromCompactDate(candidate.endDate) ?? start;
    return { start, end, confidence: start ? ("high" as const) : ("low" as const) };
  }
  const start = extractNewsDate(candidate, slug.slice(0, 4));
  return {
    start,
    end: start,
    confidence: start ? ("medium" as const) : ("low" as const),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysUntil(startDate: string, displayFrom: string): number {
  const start = new Date(`${startDate}T00:00:00+09:00`).getTime();
  const from = new Date(`${displayFrom}T00:00:00+09:00`).getTime();
  return Math.round((start - from) / 86_400_000);
}

function durationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00+09:00`).getTime();
  const end = new Date(`${endDate}T00:00:00+09:00`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function scoreEvent(
  event: Omit<CultureEvent, "scores" | "score" | "rationale">,
  displayFrom: string,
): {
  scores: EventScores;
  score: number;
  rationale: string;
} {
  const text = `${event.title} ${event.description ?? ""}`;
  const sourceTypes = new Set(event.sources.map((s) => s.type));
  const newsCount = event.sources.filter((s) => s.type === "news").length;
  const hasMajor = MAJOR_TERMS.some((term) => text.includes(term));
  const official = sourceTypes.has("tour-api");
  const d = daysUntil(event.startDate, displayFrom);
  const urgency = d < 0 ? 55 : d <= 1 ? 95 : d <= 3 ? 80 : 60;

  const scores: EventScores = {
    importance: clamp(45 + (hasMajor ? 35 : 0) + (/국제|국립|비엔날레/.test(text) ? 15 : 0)),
    interest: clamp(35 + newsCount * 12 + (hasMajor ? 30 : 0)),
    urgency: clamp(urgency),
    scale: clamp(35 + (hasMajor ? 35 : 0) + (/전국|국제|월드투어|대형|서울|부산/.test(text) ? 20 : 0)),
    reliability: clamp((official ? 75 : 35) + Math.min(newsCount, 3) * 8),
  };
  const score = clamp(
    scores.importance * 0.3 +
      scores.interest * 0.25 +
      scores.urgency * 0.15 +
      scores.scale * 0.15 +
      scores.reliability * 0.15,
  );
  const grounds = [
    official ? "공식 행사 데이터" : "뉴스 기반 후보",
    newsCount ? `뉴스 ${newsCount}건` : "",
    hasMajor ? "대형 관심 키워드" : "",
  ].filter(Boolean);
  return {
    scores,
    score,
    rationale: grounds.join(" · ") || "일정과 출처 신뢰도 기준으로 선별",
  };
}

function isSafeFinalEvent(
  event: Omit<CultureEvent, "scores" | "score" | "rationale">,
): boolean {
  const sourceTypes = new Set(event.sources.map((s) => s.type));
  if (sourceTypes.has("tour-api")) return true;
  const text = `${event.title} ${event.description ?? ""}`;
  const hasMajor = NEWS_MAJOR_TERMS.some((term) => text.includes(term));
  return hasMajor || event.sources.length >= 2;
}

type ScoredEvent = CultureEvent;

function isFeatured(event: ScoredEvent): boolean {
  if (event.displayGroup === "ongoing") return false;
  const text = `${event.title} ${event.description ?? ""}`;
  return (
    event.sources.some((source) => source.type === "news") ||
    event.category === "concert" ||
    event.category === "exhibition" ||
    event.category === "performance" ||
    event.category === "film" ||
    event.category === "esports" ||
    event.category === "popup" ||
    NEWS_MAJOR_TERMS.some((term) => text.includes(term))
  );
}

function groupForEvent(event: ScoredEvent, displayFrom: string): NonNullable<CultureEvent["displayGroup"]> {
  const endDate = event.endDate ?? event.startDate;
  const isLongRunning =
    event.startDate < displayFrom || durationDays(event.startDate, endDate) > 14;
  if (isLongRunning) return "ongoing";
  if (isFeatured(event)) return "featured";
  if (event.category === "festival" || event.category === "heritage") return "festival";
  return "festival";
}

function pickSlots(events: ScoredEvent[], displayFrom: string): ScoredEvent[] {
  const grouped = events.map((event) => ({
    ...event,
    displayGroup: groupForEvent(event, displayFrom),
  }));
  const featured = grouped.filter(isFeatured).sort((a, b) => b.score - a.score);
  const festivals = grouped
    .filter((event) => event.displayGroup === "festival")
    .sort((a, b) => b.score - a.score);
  const ongoing = grouped
    .filter((event) => event.displayGroup === "ongoing")
    .sort((a, b) => b.score - a.score);
  const selected = new Map<string, ScoredEvent>();
  const maxByGroup = { featured: 8, festival: 10, ongoing: 4 };
  const counts = { featured: 0, festival: 0, ongoing: 0 };

  function addEvent(event: ScoredEvent): boolean {
    const group = event.displayGroup ?? "featured";
    if (counts[group] >= maxByGroup[group]) return false;
    if (!selected.has(event.id)) {
      selected.set(event.id, event);
      counts[group] += 1;
    }
    return selected.size >= 20;
  }

  for (const event of featured) if (addEvent(event)) break;
  for (const event of festivals) if (addEvent(event)) break;
  for (const event of ongoing) if (addEvent(event)) break;

  for (const event of grouped.sort((a, b) => b.score - a.score)) {
    if (selected.size >= 20) break;
    addEvent(event);
  }

  return [...selected.values()].sort((a, b) => {
    const groupOrder = { featured: 0, festival: 1, ongoing: 2 };
    const aGroup = a.displayGroup ?? "featured";
    const bGroup = b.displayGroup ?? "featured";
    if (groupOrder[aGroup] !== groupOrder[bGroup]) {
      return groupOrder[aGroup] - groupOrder[bGroup];
    }
    return b.score - a.score;
  });
}

function mergeCandidate(
  map: Map<string, Omit<CultureEvent, "scores" | "score" | "rationale">>,
  candidate: RawEventCandidate,
  slug: string,
  displayFrom: string,
  displayTo: string,
) {
  if (candidate.sourceType === "news" && !isStrongNewsEvent(candidate)) return;
  const dates = datesFor(candidate, slug);
  if (!dates.start || !dates.end) return;
  if (!inDisplayRange(dates.start, dates.end, displayFrom, displayTo)) return;

  const region = candidate.region;
  const id = eventId(candidate.title, dates.start, region);
  const source = sourceFromCandidate(candidate);
  const text = `${candidate.title} ${candidate.description ?? ""}`;
  const existing = map.get(id);
  if (existing) {
    existing.sources.push(source);
    if (!existing.imageUrl && candidate.imageUrl) existing.imageUrl = candidate.imageUrl;
    if (!existing.address && candidate.address) existing.address = candidate.address;
    if (!existing.region && candidate.region) existing.region = candidate.region;
    return;
  }

  map.set(id, {
    id,
    title: stripHtml(candidate.title),
    category: categoryFor(text),
    region,
    address: candidate.address,
    startDate: dates.start,
    endDate: dates.end,
    imageUrl: candidate.imageUrl,
    description: candidate.description,
    coordinates:
      Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)
        ? { lat: candidate.lat as number, lng: candidate.lng as number }
        : undefined,
    sources: [source],
    dateConfidence: dates.confidence,
  });
}

export function emptyEventsDoc(slug: string, reason: string): EventsDoc {
  return {
    slug,
    generatedAt: new Date().toISOString(),
    range: {
      from: slug,
      to: addSlugDays(slug, 7),
    },
    meta: {
      title: "이번 주 문화 이벤트",
      dek: "뉴스 관심도와 공식 행사 정보를 함께 본 향후 7일 큐레이션",
      totalCandidates: 0,
      selected: 0,
      sourceBreakdown: { tourApi: 0, news: 0 },
      note: reason,
    },
    events: [],
  };
}

export function analyzeEvents(raw: RawEvents): EventsDoc {
  const merged = new Map<string, Omit<CultureEvent, "scores" | "score" | "rationale">>();
  for (const candidate of raw.candidates) {
    mergeCandidate(
      merged,
      candidate,
      raw.slug,
      raw.range.displayFrom,
      raw.range.displayTo,
    );
  }
  const scoredEvents = [...merged.values()]
    .filter(isSafeFinalEvent)
    .map((event) => ({ ...event, ...scoreEvent(event, raw.range.displayFrom) }))
    .sort((a, b) => b.score - a.score);
  const events = pickSlots(scoredEvents, raw.range.displayFrom);

  const doc: EventsDoc = {
    slug: raw.slug,
    generatedAt: new Date().toISOString(),
    range: {
      from: raw.range.displayFrom,
      to: raw.range.displayTo,
    },
    meta: {
      title: "이번 주 문화 이벤트",
      dek: "뉴스 관심도와 공식 행사 정보를 함께 본 향후 7일 큐레이션",
      totalCandidates: raw.totalCount,
      selected: events.length,
      sourceBreakdown: {
        tourApi: raw.candidates.filter((c) => c.sourceType === "tour-api").length,
        news: raw.candidates.filter((c) => c.sourceType === "news").length,
      },
      note: "일정은 주최 측 사정에 따라 변경될 수 있으니 방문 전 공식 링크를 확인하세요.",
    },
    events,
  };
  writeJson(eventJsonPath(raw.slug), doc);
  return doc;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || todaySlug();
  const rawPath = `${tmpDir(slug)}/raw-events.json`;
  if (!existsSync(rawPath)) {
    console.error(`raw events not found: ${rawPath}`);
    process.exit(1);
  }
  const raw = readJson<RawEvents>(rawPath);
  const doc = analyzeEvents(raw);
  console.log(`events analyzed: ${doc.events.length} selected`);
}
