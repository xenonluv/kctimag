const LABELS = {
  news: "뉴스강도",
  psychological: "심리강도",
  realtime: "실시간강도",
} as const;

type Intensities = { news: number; psychological: number; realtime: number };

export default function IntensityBars({
  intensities,
}: {
  intensities: Intensities;
}) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
      {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
        <div key={k} className="flex items-center gap-1.5">
          <span>{LABELS[k]}</span>
          <span className="inline-block h-1.5 w-16 overflow-hidden rounded bg-neutral-200 align-middle">
            <span
              className="block h-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, intensities[k]))}%` }}
            />
          </span>
          <span className="tabular-nums text-neutral-400">{intensities[k]}</span>
        </div>
      ))}
    </div>
  );
}
