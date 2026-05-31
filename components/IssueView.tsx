import type { Issue, NewsEntry } from "@/types/issue";
import Markdown from "@/components/Markdown";

// 큐레이션 다이제스트(다크/블루 색감): 편집장 픽 + 편집장 총평 + 카테고리별 카드형 뉴스 목록.
export default function IssueView({
  issue,
  eager = false,
}: {
  issue: Issue;
  eager?: boolean;
}) {
  const { meta, editorPick, editorial, categories } = issue;
  const loading = eager ? "eager" : "lazy";
  return (
    <article className="mx-auto max-w-5xl px-5 py-12">
      {/* 마스트헤드 */}
      <header className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          {meta.weekRange.from} – {meta.weekRange.to}
        </p>
        <h1 className="on-navy mx-auto mt-3 max-w-3xl font-serif text-4xl font-extrabold leading-[1.18] sm:text-5xl">
          {meta.title}
        </h1>
        {meta.dek && (
          <p className="on-navy-dim mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
            {meta.dek}
          </p>
        )}
        {meta.curation && (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-bold text-accent">
            🤖 AI가 {meta.curation.scanned.toLocaleString()}건 중{" "}
            {meta.curation.selected}건 선별
          </p>
        )}
      </header>

      {/* 편집장 픽 — 피처 카드 */}
      <section className="kct-card kct-glow page-break mb-12 overflow-hidden rounded-3xl p-3">
        {editorPick.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={editorPick.image.url}
            alt=""
            loading={loading}
            className="aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            이번 주의 픽 · Editor&rsquo;s Pick
          </span>
          <h2 className="mt-3 font-serif text-2xl font-extrabold leading-snug sm:text-[1.7rem]">
            <a
              href={editorPick.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent"
            >
              {editorPick.headline}
            </a>
          </h2>
          <p className="mt-3 leading-relaxed text-neutral-300">{editorPick.why}</p>
          <p className="mt-3 text-xs text-neutral-500">
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
          {editorPick.honorableMentions &&
            editorPick.honorableMentions.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3 text-sm text-neutral-400">
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
      </section>

      {/* 편집장 총평 — 이번 주 흐름 (정적 다크 카드 + 좌측 블루 엣지) */}
      {editorial && (
        <section className="kct-card kct-edge page-break mb-14 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            편집장의 총평 · 이번 주 흐름
          </p>
          <h2 className="on-navy mt-2 font-serif text-2xl font-extrabold leading-tight">
            {editorial.title}
          </h2>
          <div className="kct-editorial mt-4 max-w-2xl">
            <Markdown>{editorial.bodyMarkdown}</Markdown>
          </div>
        </section>
      )}

      {/* 카테고리별 카드 그리드 */}
      {categories.map((cat) => (
        <section key={cat.key} className="page-break mt-12">
          <h2 className="on-navy font-serif text-2xl font-extrabold">
            {cat.label}
            <span className="ml-2 align-middle text-sm font-bold text-accent">
              {cat.entries.length}건
            </span>
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cat.entries.map((e, i) => (
              <NewsCard key={i} entry={e} eager={eager} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}

function NewsCard({
  entry,
  eager = false,
}: {
  entry: NewsEntry;
  eager?: boolean;
}) {
  return (
    <a
      href={entry.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group kct-card kct-glow flex flex-col overflow-hidden rounded-2xl"
    >
      {entry.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image.url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          className="aspect-[3/2] w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-base font-extrabold leading-snug group-hover:text-accent">
          {entry.headline}
        </h3>
        {entry.blurb && (
          <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
            {entry.blurb}
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          {entry.outlet}
          {entry.image?.source ? ` · ${entry.image.source}` : ""}
        </p>
      </div>
    </a>
  );
}
