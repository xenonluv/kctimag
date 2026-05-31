import type { Issue, NewsEntry } from "@/types/issue";
import Markdown from "@/components/Markdown";

// 큐레이션 다이제스트: 편집장 픽 + 편집장 총평 + 카테고리별 카드형 뉴스 목록.
export default function IssueView({ issue }: { issue: Issue }) {
  const { meta, editorPick, editorial, categories } = issue;
  return (
    <article className="mx-auto max-w-5xl px-5 py-12">
      {/* 마스트헤드 */}
      <header className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {meta.weekRange.from} – {meta.weekRange.to}
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl font-extrabold leading-[1.15] sm:text-5xl">
          {meta.title}
        </h1>
        {meta.dek && (
          <p className="mx-auto mt-4 max-w-2xl font-serif text-lg italic text-neutral-600">
            {meta.dek}
          </p>
        )}
      </header>

      {/* 편집장 픽 — 피처 카드 */}
      <section className="page-break mb-12 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid sm:grid-cols-2">
          {editorPick.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={editorPick.image.url}
              alt=""
              loading="lazy"
              className="h-56 w-full object-cover sm:h-full"
            />
          )}
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              이번 주의 픽 · Editor&rsquo;s Pick
            </p>
            <h2 className="mt-2 font-serif text-2xl font-extrabold leading-tight">
              <a
                href={editorPick.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent hover:underline"
              >
                {editorPick.headline}
              </a>
            </h2>
            <p className="mt-3 leading-relaxed text-neutral-700">{editorPick.why}</p>
            <p className="mt-3 text-xs text-neutral-400">
              {editorPick.outlet && <>출처: </>}
              <a
                href={editorPick.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-accent"
              >
                {editorPick.outlet || "원문 보기"}
              </a>
              {editorPick.image?.source ? ` · ${editorPick.image.source}` : ""}
            </p>
            {editorPick.honorableMentions && editorPick.honorableMentions.length > 0 && (
              <div className="mt-4 border-t border-neutral-200 pt-3 text-sm text-neutral-500">
                <span className="font-medium">함께 주목 · </span>
                {editorPick.honorableMentions.map((h, i) => (
                  <span key={i}>
                    {i > 0 && " / "}
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-accent"
                    >
                      {h.headline}
                    </a>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 편집장 총평 — 이번 주 흐름 */}
      {editorial && (
        <section className="page-break mb-14 rounded-2xl border-l-4 border-accent bg-black/[0.03] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            편집장의 총평 · 이번 주 흐름
          </p>
          <h2 className="mt-2 font-serif text-2xl font-extrabold leading-tight">
            {editorial.title}
          </h2>
          <div className="kct-prose mt-4 max-w-2xl">
            <Markdown>{editorial.bodyMarkdown}</Markdown>
          </div>
        </section>
      )}

      {/* 카테고리별 카드 그리드 */}
      {categories.map((cat) => (
        <section
          key={cat.key}
          className="page-break mt-12 border-t border-neutral-300 pt-8"
        >
          <h2 className="font-serif text-2xl font-extrabold">{cat.label}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cat.entries.map((e, i) => (
              <NewsCard key={i} entry={e} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}

function NewsCard({ entry }: { entry: NewsEntry }) {
  return (
    <a
      href={entry.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      {entry.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image.url}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-accent">
          {entry.headline}
        </h3>
        {entry.blurb && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600">
            {entry.blurb}
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-400">
          {entry.outlet}
          {entry.image?.source ? ` · ${entry.image.source}` : ""}
        </p>
      </div>
    </a>
  );
}
