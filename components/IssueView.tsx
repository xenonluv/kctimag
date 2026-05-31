import type { Issue, NewsEntry } from "@/types/issue";

// 매거진 1호 = 큐레이션 다이제스트 (편집장 픽 + 카테고리별 뉴스 목록).
export default function IssueView({ issue }: { issue: Issue }) {
  const { meta, editorPick, categories } = issue;
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* 마스트헤드 */}
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {meta.weekRange.from} – {meta.weekRange.to}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-extrabold leading-[1.15] sm:text-5xl">
          {meta.title}
        </h1>
        {meta.dek && (
          <p className="mx-auto mt-4 max-w-xl font-serif text-lg italic text-neutral-600">
            {meta.dek}
          </p>
        )}
      </header>

      {/* 편집장 픽 */}
      <section className="page-break mb-14 rounded-xl border border-neutral-300 bg-white/70 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          이번 주의 픽 · Editor&rsquo;s Pick
        </p>
        {editorPick.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={editorPick.image.url}
            alt=""
            loading="lazy"
            className="mt-3 aspect-[16/9] w-full rounded-lg object-cover"
          />
        )}
        <h2 className="mt-3 font-serif text-2xl font-extrabold leading-tight">
          <a
            href={editorPick.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            {editorPick.headline}
          </a>
        </h2>
        {editorPick.image?.source && (
          <p className="mt-1 text-xs text-neutral-400">{editorPick.image.source}</p>
        )}
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
      </section>

      {/* 카테고리별 뉴스 목록 */}
      {categories.map((cat) => (
        <section
          key={cat.key}
          className="page-break mt-10 border-t border-neutral-300 pt-8"
        >
          <h2 className="font-serif text-2xl font-extrabold">{cat.label}</h2>
          <ul className="mt-5 space-y-6">
            {cat.entries.map((e, i) => (
              <EntryRow key={i} entry={e} />
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

function EntryRow({ entry }: { entry: NewsEntry }) {
  return (
    <li className="flex gap-4">
      {entry.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image.url}
          alt=""
          loading="lazy"
          className="h-20 w-28 flex-none rounded object-cover sm:h-24 sm:w-36"
        />
      )}
      <div className="min-w-0">
        <h3 className="font-serif text-lg font-bold leading-snug">
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent hover:underline"
          >
            {entry.headline}
          </a>
        </h3>
        {entry.blurb && (
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {entry.blurb}
          </p>
        )}
        <p className="mt-1 text-xs text-neutral-400">
          {entry.outlet}
          {entry.image?.source ? ` · ${entry.image.source}` : ""}
        </p>
      </div>
    </li>
  );
}
