import type { Issue, SourceRef } from "@/types/issue";
import Markdown from "@/components/Markdown";
import ImageFigure from "@/components/ImageFigure";

// 매거진 1호 전체 렌더 (웹 상세 + PDF 인쇄 공용).
export default function IssueView({ issue }: { issue: Issue }) {
  const { meta, sections, editorial } = issue;
  const ordered = [...sections].sort((a, b) => a.rank - b.rank);
  const cover = ordered[0];
  const rest = ordered.slice(1);

  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      {/* 마스트헤드 */}
      <header className="mb-8 text-center">
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

      {/* 표지 히어로 */}
      {meta.coverImage && <ImageFigure image={meta.coverImage} />}

      {/* 커버스토리 (1위) — 히어로가 대표 이미지 역할 → 섹션 자체 이미지는 생략 */}
      {cover && (
        <section className="page-break mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            커버스토리 · {cover.category}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-extrabold leading-tight sm:text-4xl">
            {cover.heading}
          </h2>
          <div className="kct-dropcap mt-5">
            <Markdown>{cover.bodyMarkdown}</Markdown>
          </div>
          <Sources sources={cover.sources} />
        </section>
      )}

      {/* 나머지 피처 */}
      {rest.map((s) => (
        <section
          key={s.id}
          className="page-break mt-16 border-t border-neutral-300 pt-10"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            {s.category}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-extrabold leading-tight sm:text-3xl">
            {s.heading}
          </h2>
          {s.images?.[0] && <ImageFigure image={s.images[0]} />}
          <div className="kct-dropcap mt-5">
            <Markdown>{s.bodyMarkdown}</Markdown>
          </div>
          <Sources sources={s.sources} />
        </section>
      ))}

      {/* 편집장 칼럼 */}
      {editorial && (
        <section className="page-break mt-20 border-t-2 border-ink pt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            Editor&rsquo;s Letter
          </p>
          <h2 className="mt-2 font-serif text-2xl font-extrabold leading-tight sm:text-3xl">
            {editorial.title}
          </h2>
          <div className="kct-dropcap mt-5">
            <Markdown>{editorial.bodyMarkdown}</Markdown>
          </div>
          <p className="mt-6 text-right font-serif italic text-neutral-600">
            — {editorial.author}
          </p>
        </section>
      )}
    </article>
  );
}

function Sources({ sources }: { sources: SourceRef[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <p className="mt-6 text-xs leading-relaxed text-neutral-400">
      출처 ·{" "}
      {sources.map((src, i) => (
        <span key={i}>
          {i > 0 && ", "}
          <a
            href={src.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-accent"
          >
            {src.title}
          </a>
        </span>
      ))}
    </p>
  );
}
