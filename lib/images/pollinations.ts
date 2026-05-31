// Pollinations.ai — 키 불필요 무료 AI 이미지 생성. URL을 그대로 임베드(요청 시 생성).
// "AI 슬롭" 느낌을 줄이기 위해 일관된 에디토리얼 아트디렉션 스타일을 입힌다.
const EDITORIAL_STYLE =
  "editorial magazine illustration, minimal, muted earthy color palette, subtle paper grain texture, refined fine-art style, soft light, no text, no watermark";

export function pollinationsUrl(
  prompt: string,
  seed = 1,
  w = 1024,
  h = 576,
): string {
  const base = prompt.replace(/\s+/g, " ").trim().slice(0, 280);
  const full = `${base}, ${EDITORIAL_STYLE}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    full,
  )}?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux`;
}
