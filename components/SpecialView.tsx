import type { SpecialArticle } from "@/types/special";
import Markdown from "@/components/Markdown";

// 특별기획: 특정 주제 하나를 깊이 파고든 장문 논평. 마스트헤드 + 본문(마크다운) + 참고 뉴스 각주.
export default function SpecialView({
  article,
}: {
  article: SpecialArticle;
}) {
  const { meta, bodyMarkdown, sources, author } = article;
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      {/* 마스트헤드 */}
      <header className="mb-14 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
          ✦ {meta.kicker ?? "특별기획"}
        </p>
        <h1 className="on-navy mx-auto mt-7 max-w-3xl font-serif text-3xl font-extrabold leading-[1.35] tracking-tight sm:text-4xl md:text-[2.75rem]">
          {meta.title.split("\n").map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
        {meta.dek && (
          <p className="on-navy-dim mx-auto mt-7 max-w-2xl text-base leading-[1.9] sm:text-lg">
            {meta.dek}
          </p>
        )}
        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-neutral-500">
          {meta.date}
          {author ? ` · ${author}` : ""}
        </p>
      </header>

      {/* 표지 이미지 (선택) */}
      {meta.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.coverImageUrl}
          alt=""
          className="mb-10 aspect-[16/9] w-full rounded-3xl object-cover"
        />
      )}

      {/* 본문 */}
      <section className="kct-card kct-edge rounded-2xl p-6 sm:p-9">
        <div className="kct-editorial">
          <Markdown>{bodyMarkdown}</Markdown>
        </div>
      </section>

      {/* 참고한 뉴스 (선택) */}
      {sources && sources.length > 0 && (
        <section className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            참고한 뉴스
          </p>
          <ul className="mt-4 space-y-3">
            {sources.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium leading-snug hover:text-accent"
                >
                  {s.headline}
                </a>
                <p className="mt-1 text-xs text-neutral-500">
                  {s.outlet ? s.outlet : "원문"}
                  {s.note ? ` · ${s.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
