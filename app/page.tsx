import Link from "next/link";
import { listIssues, latestIssue } from "@/lib/content";
import SubscribeForm from "@/components/SubscribeForm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-static";

export default function Home() {
  const issues = listIssues();
  const latest = latestIssue();
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
