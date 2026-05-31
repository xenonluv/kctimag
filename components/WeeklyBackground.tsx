// 매주 바뀌는 은은한 포스트모던 배경 이미지 레이어. (issue.meta.backgroundImageUrl)
// 콘텐츠 뒤에 저투명도로 고정 배치. PDF/인쇄에는 표시하지 않음(no-print).
export default function WeeklyBackground({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <div
      aria-hidden
      className="kct-bg no-print"
      style={{ backgroundImage: `url("${url}")` }}
    />
  );
}
