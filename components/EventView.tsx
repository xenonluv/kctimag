import type { CultureEvent, EventsDoc } from "@/types/event";

const CATEGORY_LABELS = {
  concert: "콘서트",
  festival: "축제",
  exhibition: "전시",
  performance: "공연",
  film: "영화",
  esports: "e스포츠",
  popup: "팝업",
  heritage: "문화유산",
  other: "기타",
};

interface EventViewProps {
  doc: EventsDoc | null;
}

const GROUP_LABELS = {
  featured: "주목 대형 이벤트",
  festival: "축제·지역 행사",
  ongoing: "진행 중인 전시·상설 행사",
};

const GROUP_DESCRIPTIONS = {
  featured:
    "뉴스 관심도와 대형 문화성을 우선으로 본 공연, 전시, 영화제, 팝업입니다. 날짜가 확인된 후보만 표시합니다.",
  festival: "공식 행사 데이터에서 일정과 장소가 확인된 축제와 지역 문화행사입니다.",
  ongoing:
    "이번 주에도 이어지는 장기 전시, 상설 공연, 반복 문화행사입니다. 목록 과점을 막기 위해 일부만 표시합니다.",
};

function formatDate(start: string, end?: string): string {
  if (!end || end === start) return start;
  return `${start} ~ ${end}`;
}

function visitKoreaSearchUrl(title: string): string {
  return `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${encodeURIComponent(
    title,
  )}`;
}

function eventHref(event: CultureEvent): string | undefined {
  if (event.officialUrl) return event.officialUrl;
  const linkedSource = event.sources.find((source) => source.url);
  if (linkedSource?.url) return linkedSource.url;
  const tourSource = event.sources.find(
    (source) => source.type === "tour-api" && source.contentId,
  );
  return tourSource ? visitKoreaSearchUrl(event.title) : undefined;
}

export default function EventView({ doc }: EventViewProps) {
  const events = doc?.events ?? [];
  const groupedEvents = (["featured", "festival", "ongoing"] as const)
    .map((group) => ({
      group,
      events: events.filter((event) => (event.displayGroup ?? "featured") === group),
    }))
    .filter((section) => section.events.length > 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <section className="mb-8">
        <p className="text-xs uppercase tracking-widest text-accent">
          Culture Events · {doc ? `${doc.range.from} ~ ${doc.range.to}` : "준비 중"}
        </p>
        <h1 className="on-navy mt-2 font-serif text-3xl font-extrabold leading-tight sm:text-4xl">
          다음 주 문화 이벤트
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-400">
          뉴스 관심도와 공식 행사 정보를 함께 본 향후 7일 큐레이션입니다.
          일정은 주최 측 사정에 따라 변경될 수 있으니 방문 전 공식 링크를
          확인하세요.
        </p>
      </section>

      {events.length === 0 ? (
        <section className="kct-card rounded-3xl p-8 text-center">
          <h2 className="font-serif text-2xl font-bold">표시할 이벤트가 없습니다</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {doc?.meta.note ||
              "이번 주 공식 일정과 뉴스 후보에서 표시 가능한 이벤트를 찾지 못했습니다."}
          </p>
        </section>
      ) : (
        <div className="grid gap-10">
          {groupedEvents.map(({ group, events: sectionEvents }) => (
            <section key={group}>
              <div className="mb-4">
                <h2 className="on-navy font-serif text-2xl font-bold">
                  {GROUP_LABELS[group]}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-neutral-400">
                  {GROUP_DESCRIPTIONS[group]}
                </p>
              </div>
              <ol className="grid gap-5">
                {sectionEvents.map((event, index) => {
                  const sourceTypes = new Set(event.sources.map((s) => s.type));
                  const href = eventHref(event);
                  const body = (
                    <>
                      {event.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.imageUrl}
                          alt=""
                          className="aspect-[16/10] w-full rounded-2xl object-cover sm:w-52"
                        />
                      )}
                      <div className="min-w-0 flex-1 px-3 py-4 sm:px-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-accent/15 px-2.5 py-1 font-bold text-accent">
                            #{index + 1}
                          </span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">
                            {CATEGORY_LABELS[event.category]}
                          </span>
                          {sourceTypes.has("tour-api") && (
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">
                              공식 행사
                            </span>
                          )}
                          {sourceTypes.has("news") && (
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-neutral-300">
                              뉴스
                            </span>
                          )}
                        </div>
                        <h3 className="on-navy mt-3 font-serif text-2xl font-bold leading-snug group-hover:text-accent">
                          {event.title}
                        </h3>
                        <p className="mt-2 text-sm text-neutral-400">
                          {formatDate(event.startDate, event.endDate)}
                          {event.region ? ` · ${event.region}` : ""}
                          {event.address ? ` · ${event.address}` : ""}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                          {event.rationale}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="text-xs text-neutral-500">
                            {href ? "자세히 보기" : "출처"} · {event.sources.length}건
                          </span>
                          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-sm font-bold text-accent">
                            {event.score}점
                          </span>
                        </div>
                      </div>
                    </>
                  );
                  return (
                    <li key={event.id}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${event.title} 자세히 보기`}
                          className="group kct-card kct-glow block overflow-hidden rounded-3xl p-3 sm:flex sm:gap-4"
                        >
                          {body}
                        </a>
                      ) : (
                        <div className="kct-card kct-glow overflow-hidden rounded-3xl p-3 sm:flex sm:gap-4">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
