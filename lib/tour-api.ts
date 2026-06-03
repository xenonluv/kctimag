import { requireEnv } from "@/lib/env";

const ENDPOINT = "https://apis.data.go.kr/B551011/KorService2/searchFestival2";
const MAX_PAGES = 20;
const TIMEOUT_MS = 15_000;

export interface TourFestivalItem {
  contentid: string;
  contenttypeid?: string;
  title: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  createdtime?: string;
  modifiedtime?: string;
  eventstartdate: string;
  eventenddate?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  tel?: string;
}

interface TourApiBody {
  items?: {
    item?: TourFestivalItem[] | TourFestivalItem;
  };
  numOfRows?: number | string;
  pageNo?: number | string;
  totalCount?: number | string;
}

interface TourApiResponse {
  response?: {
    header?: {
      resultCode?: string;
      resultMsg?: string;
    };
    body?: TourApiBody;
  };
}

export interface SearchFestivalOptions {
  eventStartDate: string;
  numOfRows?: number;
}

function toArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toNumber(value: number | string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchJson(url: URL): Promise<TourApiResponse> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "kctimag-events/1.0" },
      signal: ac.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`TourAPI ${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as TourApiResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchFestivals(
  opts: SearchFestivalOptions,
): Promise<TourFestivalItem[]> {
  const serviceKey = requireEnv("TOUR_API_SERVICE_KEY").trim();
  const numOfRows = Math.min(opts.numOfRows ?? 100, 100);
  const all: TourFestivalItem[] = [];

  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo += 1) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("MobileOS", "ETC");
    url.searchParams.set("MobileApp", "kctimag");
    url.searchParams.set("_type", "json");
    url.searchParams.set("numOfRows", String(numOfRows));
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("eventStartDate", opts.eventStartDate);

    const data = await fetchJson(url);
    const header = data.response?.header;
    if (header?.resultCode !== "0000") {
      throw new Error(
        `TourAPI result ${header?.resultCode ?? "unknown"}: ${
          header?.resultMsg ?? "unknown error"
        }`,
      );
    }

    const body = data.response?.body;
    const items = toArray(body?.items?.item);
    all.push(...items);

    const currentPage = toNumber(body?.pageNo, pageNo);
    const rows = toNumber(body?.numOfRows, numOfRows);
    const total = toNumber(body?.totalCount, Number.NaN);
    if (Number.isFinite(total)) {
      if (currentPage * rows >= total) break;
    } else if (items.length < numOfRows) {
      break;
    }
  }

  return all;
}
