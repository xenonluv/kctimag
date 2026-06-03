import "@/lib/load-env";
import { cleanHtml, searchNews, toISO, type NaverNewsRaw } from "@/lib/naver";
import { searchFestivals, type TourFestivalItem } from "@/lib/tour-api";
import { tmpDir, writeJson } from "@/lib/paths";
import { compactDate, subSlugDays, todaySlug, addSlugDays } from "./date-utils";

const EVENT_NEWS_QUERIES = [
  "K팝 콘서트 다음주",
  "아이돌 콘서트 예정",
  "BTS 공연 예정",
  "블랙핑크 콘서트 예정",
  "세븐틴 콘서트 예정",
  "스트레이 키즈 콘서트 예정",
  "팬미팅 개최",
  "월드투어 서울",
  "영화제 개막",
  "국제영화제 개막",
  "전시 개막",
  "미술관 특별전",
  "박물관 특별전",
  "문화행사 개최",
  "팝업스토어 오픈",
  "e스포츠 결승",
  "게임쇼 개최",
  "뮤지컬 개막",
  "공연 개막",
];

const INCLUDE_TERMS = [
  "콘서트",
  "공연",
  "팬미팅",
  "월드투어",
  "축제",
  "페스티벌",
  "영화제",
  "개막",
  "전시",
  "특별전",
  "미술관",
  "박물관",
  "뮤지컬",
  "연극",
  "오페라",
  "클래식",
  "팝업",
  "팝업스토어",
  "e스포츠",
  "게임쇼",
  "결승",
  "개최",
  "오픈",
];

const EXCLUDE_TERMS = [
  "정치",
  "선거",
  "국회",
  "대통령",
  "장관",
  "외교",
  "주가",
  "증시",
  "부동산",
  "사건",
  "사고",
  "범죄",
  "소송",
  "논란",
  "사망",
  "재판",
];

export interface RawEventCandidate {
  sourceType: "tour-api" | "news";
  title: string;
  description?: string;
  url?: string;
  outlet?: string;
  pubDate?: string;
  contentId?: string;
  address?: string;
  region?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  raw: unknown;
}

export interface RawEvents {
  slug: string;
  collectedAt: string;
  range: {
    collectFrom: string;
    displayFrom: string;
    displayTo: string;
  };
  totalCount: number;
  candidates: RawEventCandidate[];
}

function regionFromAddress(address = ""): string | undefined {
  return address.trim().split(/\s+/)[0] || undefined;
}

function hostName(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function isRelevantNews(item: NaverNewsRaw): boolean {
  const text = `${cleanHtml(item.title)} ${cleanHtml(item.description)}`;
  if (EXCLUDE_TERMS.some((term) => text.includes(term))) return false;
  return INCLUDE_TERMS.some((term) => text.includes(term));
}

function fromTourItem(item: TourFestivalItem): RawEventCandidate {
  const address = [item.addr1, item.addr2].filter(Boolean).join(" ").trim();
  return {
    sourceType: "tour-api",
    title: cleanHtml(item.title),
    description: item.tel,
    contentId: item.contentid,
    address: address || undefined,
    region: regionFromAddress(address),
    startDate: item.eventstartdate,
    endDate: item.eventenddate,
    imageUrl: item.firstimage || item.firstimage2,
    lat: item.mapy ? Number(item.mapy) : undefined,
    lng: item.mapx ? Number(item.mapx) : undefined,
    raw: item,
  };
}

function fromNewsItem(item: NaverNewsRaw): RawEventCandidate {
  const url = item.originallink || item.link;
  return {
    sourceType: "news",
    title: cleanHtml(item.title),
    description: cleanHtml(item.description),
    url,
    outlet: hostName(url),
    pubDate: toISO(item.pubDate),
    raw: item,
  };
}

export async function collectEvents(slug = todaySlug()): Promise<RawEvents> {
  const collectFrom = subSlugDays(slug, 90);
  const displayTo = addSlugDays(slug, 7);
  const candidates: RawEventCandidate[] = [];

  const festivals = await searchFestivals({
    eventStartDate: compactDate(collectFrom),
    numOfRows: 100,
  });
  candidates.push(...festivals.map(fromTourItem));

  const seenNews = new Set<string>();
  for (const query of EVENT_NEWS_QUERIES) {
    const items = await searchNews(query, { display: 20, sort: "date" });
    for (const item of items) {
      const url = item.originallink || item.link;
      if (seenNews.has(url) || !isRelevantNews(item)) continue;
      seenNews.add(url);
      candidates.push(fromNewsItem(item));
    }
  }

  const raw: RawEvents = {
    slug,
    collectedAt: new Date().toISOString(),
    range: {
      collectFrom,
      displayFrom: slug,
      displayTo,
    },
    totalCount: candidates.length,
    candidates,
  };
  writeJson(`${tmpDir(slug)}/raw-events.json`, raw);
  return raw;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || todaySlug();
  collectEvents(slug)
    .then((raw) => {
      console.log(`events raw: ${raw.totalCount} candidates`);
    })
    .catch((e) => {
      console.error("events collect failed:", e);
      process.exit(1);
    });
}
