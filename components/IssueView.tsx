import type { Issue } from "@/types/issue";
import Markdown from "@/components/Markdown";
import ImageFigure from "@/components/ImageFigure";
import IntensityBars from "@/components/IntensityBars";

// 매거진 1호 전체 렌더 (웹 상세 페이지 + PDF 인쇄 경로 공용).
export default function IssueView({ issue }: { issue: Issue }) {
  const { meta, sections, editorial } = issue;
  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-accent">
          {meta.weekRange.from} – {meta.weekRange.to}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight">
          {meta.title}
        </h1>
        <p className="mt-3 text-lg text-neutral-600">{meta.dek}</p>
      </header>

      {meta.coverImage && <ImageFigure image={meta.coverImage} />}

      {sections.map((s) => (
        <section key={s.id} className="page-break mt-12">
          <div className="mb-1 text-sm font-medium text-accent">
            #{s.rank} · {s.category}
          </div>
          <h2 className="font-serif text-2xl font-bold">{s.heading}</h2>
          <div className="mb-4 mt-2">
            <IntensityBars intensities={s.intensities} />
          </div>
          {s.images?.map((img, i) => <ImageFigure key={i} image={img} />)}
          {s.pullQuote && (
            <blockquote className="my-6 border-l-4 border-accent pl-4 font-serif text-xl italic text-neutral-700">
              {s.pullQuote}
            </blockquote>
          )}
          <Markdown>{s.bodyMarkdown}</Markdown>
          {s.sources?.length > 0 && (
            <div className="mt-4 text-sm text-neutral-500">
              <span className="font-medium">출처: </span>
              {s.sources.map((src, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <a
                    href={src.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {src.title}
                  </a>
                </span>
              ))}
            </div>
          )}
        </section>
      ))}

      {editorial && (
        <section className="page-break mt-16 border-t-2 border-ink pt-8">
          <p className="text-sm uppercase tracking-widest text-accent">Editorial</p>
          <h2 className="mt-2 font-serif text-2xl font-bold">{editorial.title}</h2>
          <div className="mt-4">
            <Markdown>{editorial.bodyMarkdown}</Markdown>
          </div>
          <p className="mt-4 text-right text-neutral-600">— {editorial.author}</p>
        </section>
      )}
    </article>
  );
}
