// 움직이는 기하학 배경 — 순수 CSS 벡터 도형, transform·opacity만 애니메이션(GPU 합성 → 가벼움).
// 콘텐츠 뒤(z-index:-1), 클릭 통과(pointer-events:none), 인쇄 제외(no-print),
// 모션 줄이기(prefers-reduced-motion) 시 정지. 탭 숨김 시 브라우저가 컴포지터 애니메이션 자동 일시정지.
export default function GeoBackground() {
  return (
    <div aria-hidden className="kct-geo no-print">
      {/* 2D 글로우 오브 + 윤곽선 */}
      <span className="kct-g1" />
      <span className="kct-g2" />
      <span className="kct-g3" />
      <span className="kct-g4" />
      <span className="kct-g5" />

      {/* 3D 와이어프레임 큐브(정육면체) — 6면, 스스로 회전 + 드리프트 */}
      <div className="kct-cube-wrap">
        <div className="kct-cube">
          <span className="kct-cf kct-cf-front" />
          <span className="kct-cf kct-cf-back" />
          <span className="kct-cf kct-cf-right" />
          <span className="kct-cf kct-cf-left" />
          <span className="kct-cf kct-cf-top" />
          <span className="kct-cf kct-cf-bottom" />
        </div>
      </div>

      {/* 3D 와이어프레임 삼각뿔 — 3개 삼각형 면이 꼭지점에서 만나는 피라미드, 스스로 회전 + 드리프트 */}
      <div className="kct-tetra-wrap">
        <div className="kct-tetra">
          {[0, 1, 2].map((i) => (
            <svg
              key={i}
              className={`kct-tf kct-tf-${i}`}
              viewBox="0 0 100 86.6"
              preserveAspectRatio="none"
            >
              <polygon
                points="50,2 98,85 2,85"
                fill="rgba(124,107,255,0.03)"
                stroke="rgba(124,107,255,0.34)"
                strokeWidth="1.6"
              />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}
