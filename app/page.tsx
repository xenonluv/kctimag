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
        {latest ? (
          <Link
            href={`/issues/${latest.meta.slug}`}
            className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            {latest.meta.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latest.meta.coverImageUrl}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            )}
            <div className="p-6">
              <p className="text-sm uppercase tracking-widest text-accent">
                최신호 · {latest.meta.date}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight group-hover:text-accent">
                {latest.meta.title}
              </h1>
              <p className="mt-2 text-neutral-600">{latest.meta.dek}</p>
            </div>
          </Link>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
            아직 발행된 호가 없습니다. 첫 호가 곧 발행됩니다.
          </p>
        )}

        <section
          id="subscribe"
          className="mt-12 rounded-xl bg-ink px-6 py-8 text-paper"
        >
          <h2 className="font-serif text-2xl font-bold">매주 무료로 받아보세요</h2>
          <p className="mt-1 text-neutral-300">
            한 주의 한국 문화를 정리한 매거진과 PDF를 매주 이메일로 보내드립니다.
          </p>
          <div className="mt-4">
            <SubscribeForm />
          </div>
        </section>

        {rest.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-serif text-xl font-bold">지난 호</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {rest.map((it) => (
                <li key={it.slug}>
                  <Link
                    href={`/issues/${it.slug}`}
                    className="group flex gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-accent"
                  >
                    {it.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.coverImageUrl}
                        alt=""
                        className="h-20 w-28 flex-none rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="text-xs text-neutral-400">{it.date}</p>
                      <h3 className="font-medium leading-snug group-hover:text-accent">
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
