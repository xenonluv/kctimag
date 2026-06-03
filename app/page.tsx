import Link from "next/link";
import { listIssues, latestIssue } from "@/lib/content";
import { latestEvents } from "@/lib/events";
import SubscribeForm from "@/components/SubscribeForm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-static";

export default function Home() {
  const issues = listIssues();
  const latest = latestIssue();
  const events = latestEvents();
  const rest = issues.slice(1);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-10">
        {latest?.meta.curation && (
          <section className="kct-card mb-8 rounded-3xl p-7 sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-bold text-accent">
              🤖 AI 엄선 카드뉴스
            </span>
            <h2 className="on-navy mt-4 font-serif text-2xl font-extrabold leading-snug sm:text-[1.7rem]">
              이번 주 쏟아진{" "}
              <span className="text-accent">
                {latest.meta.curation.scanned.toLocaleString()}건
              </span>
              의 한국 문화 뉴스 중,
              <br className="hidden sm:block" /> AI가 중요도를 가려{" "}
              <span className="text-accent">{latest.meta.curation.selected}건</span>
              만 골랐어요.
            </h2>
            {latest.meta.curation.rationale ? (
              <div className="mt-4 rounded-xl border-l-2 border-accent bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  🤖 AI 에디터의 선정 이유
                  {latest.meta.analysis ? " · 수집 뉴스 기반 추정치" : ""}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-300">
                  {latest.meta.curation.rationale}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                네이버 검색 전 카테고리에서 모은 한 주치 기사를 전국·글로벌 반향,
                산업 영향, 화제성 기준으로 큐레이션했습니다. 아래는 AI가 분석한
                기사 풀입니다.
              </p>
            )}
            <ul className="mt-5 flex flex-wrap gap-2">
              {latest.meta.curation.breakdown.map((b) => (
                <li
                  key={b.label}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-neutral-300"
                >
                  {b.label}{" "}
                  <span className="font-bold text-accent">{b.count}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-8 rounded-3xl border border-amber-300/35 bg-gradient-to-r from-amber-500/18 via-orange-500/12 to-white/[0.03] px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Next Week
            </p>
            <h2 className="on-navy mt-1 font-serif text-2xl font-bold">
              다음 주 문화 이벤트도 확인하세요
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-400">
              공연, 전시, 축제, 팝업 등 앞으로 7일 안의 행사를 중요도순으로
              모았습니다.
            </p>
          </div>
          <Link
            href="/events"
            className="mt-4 inline-flex rounded-full bg-amber-400 px-4 py-2 text-sm font-extrabold text-[#191006] shadow-[0_0_24px_rgba(251,191,36,0.28)] hover:bg-orange-300 sm:mt-0"
          >
            이벤트 보기
          </Link>
        </section>

        {latest ? (
          <Link
            href={`/issues/${latest.meta.slug}`}
            className="group kct-card kct-glow block overflow-hidden rounded-3xl p-3"
          >
            {latest.meta.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latest.meta.coverImageUrl}
                alt=""
                className="aspect-[16/9] w-full rounded-2xl object-cover"
              />
            )}
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <p className="text-xs uppercase tracking-widest text-accent">
                최신호 · {latest.meta.date}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-extrabold leading-tight group-hover:text-accent">
                {latest.meta.title}
              </h1>
              <p className="mt-2 text-neutral-400">{latest.meta.dek}</p>
            </div>
          </Link>
        ) : (
          <p className="on-navy-dim rounded-3xl border border-dashed border-white/20 p-10 text-center">
            아직 발행된 호가 없습니다. 첫 호가 곧 발행됩니다.
          </p>
        )}

        {events && events.events.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-accent">
                  Next Week Events
                </p>
                <h2 className="on-navy mt-1 font-serif text-xl font-bold">
                  다음 주 문화 이벤트
                </h2>
              </div>
              <Link
                href="/events"
                className="rounded-full bg-amber-400 px-3.5 py-2 text-sm font-extrabold text-[#191006] hover:bg-orange-300"
              >
                전체 이벤트 보기
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              {events.events.slice(0, 3).map((event) => (
                <li key={event.id}>
                  <Link
                    href="/events"
                    className="group kct-card kct-glow block h-full rounded-2xl p-4"
                  >
                    <p className="text-xs text-neutral-500">
                      {event.startDate}
                      {event.region ? ` · ${event.region}` : ""}
                    </p>
                    <h3 className="mt-2 font-bold leading-snug group-hover:text-accent">
                      {event.title}
                    </h3>
                    <p className="mt-3 text-xs font-bold text-accent">
                      {event.score}점
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          id="subscribe"
          className="kct-card mt-12 rounded-3xl px-6 py-8"
        >
          <h2 className="font-serif text-2xl font-bold">매주 무료로 받아보세요</h2>
          <p className="mt-1 text-neutral-400">
            한 주의 한국 문화를 정리한 뉴스모음과 PDF를 매주 이메일로 보내드립니다.
          </p>
          <div className="mt-4">
            <SubscribeForm />
          </div>
        </section>

        {rest.length > 0 && (
          <section className="mt-12">
            <h2 className="on-navy mb-4 font-serif text-xl font-bold">지난 호</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {rest.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/issues/${it.slug}`}
                    className="group kct-card kct-glow flex gap-4 rounded-2xl p-3"
                  >
                    {it.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.coverImageUrl}
                        alt=""
                        className="h-20 w-28 flex-none rounded-xl object-cover"
                      />
                    )}
                    <div className="py-1">
                      <p className="text-xs text-neutral-500">{it.date}</p>
                      <h3 className="font-bold leading-snug group-hover:text-accent">
                        {it.title}
                      </h3>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
