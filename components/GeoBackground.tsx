// 움직이는 기하학 배경 — 순수 CSS 벡터 도형, transform·opacity만 애니메이션(GPU 합성 → 가벼움).
// 콘텐츠 뒤(z-index:-1), 클릭 통과(pointer-events:none), 인쇄 제외(no-print),
// 모션 줄이기(prefers-reduced-motion) 시 정지. 탭 숨김 시 브라우저가 컴포지터 애니메이션 자동 일시정지.
export default function GeoBackground() {
  return (
    <div aria-hidden className="kct-geo no-print">
      <span className="kct-g1" />
      <span className="kct-g2" />
      <span className="kct-g3" />
      <span className="kct-g4" />
      <span className="kct-g5" />
    </div>
  );
}
