// Pollinations.ai — 키 불필요 무료 AI 이미지 생성. URL을 그대로 임베드(요청 시 생성).
export function pollinationsUrl(
  prompt: string,
  seed = 1,
  w = 1024,
  h = 576,
): string {
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 380);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    clean,
  )}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}
