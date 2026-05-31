import type { ImageAsset } from "@/types/issue";

// 계층형 이미지 렌더: AI 라벨 / 출처표기 / 라이선스 / 링크형 처리.
export default function ImageFigure({ image }: { image: ImageAsset }) {
  // 합법 임베드 이미지가 없는 경우 → 원문 링크만 노출 (저작권 보호)
  if (image.kind === "link" || !image.url) {
    return (
      <figure className="my-6 rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <a
          href={image.sourceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-accent underline"
        >
          {image.caption || "관련 보도 보기"} ↗
        </a>
        <figcaption className="mt-1 text-sm text-neutral-500">
          저작권 보호 이미지 — 원문에서 확인
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="my-6">
      {/* 다양한 외부 호스트 → 일반 img (Vercel 이미지 최적화 쿼터 미사용) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        className="w-full rounded-lg object-cover"
      />
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
        <span>{image.caption}</span>
        {image.isAI && (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">
            AI 생성
          </span>
        )}
        {image.attribution && <span>· {image.attribution}</span>}
        {image.license && <span className="text-neutral-400">· {image.license}</span>}
      </figcaption>
    </figure>
  );
}
