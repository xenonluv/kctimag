// Pollinations.ai — 키 불필요 무료 AI 이미지 생성. URL을 그대로 임베드(요청 시 생성).
// "AI 슬롭" 느낌을 줄이기 위해 일관된 에디토리얼 아트디렉션 스타일을 입힌다.
const EDITORIAL_STYLE =
  "editorial magazine illustration, minimal, muted earthy color palette, subtle paper grain texture, refined fine-art style, soft light, no text, no watermark";

export function pollinationsUrl(
  prompt: string,
  seed = 1,
  w = 640,
  h = 360,
): string {
  const base = prompt.replace(/\s+/g, " ").trim().slice(0, 280);
  const full = `${base}, ${EDITORIAL_STYLE}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    full,
  )}?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux`;
}

// 매주 바뀌는 은은한 포스트모던 배경 이미지. 슬러그를 시드로 삼아 매호 다른 모티프·이미지를 만든다.
const POSTMODERN_MOTIFS = [
  "memphis design shapes, squiggles, dots and arcs",
  "bauhaus geometric composition, circles squares triangles",
  "abstract collage of organic blobs and soft grids",
  "risograph layered shapes with halftone texture",
  "terrazzo scatter pattern of small fragments",
  "retro postmodern arcs and waves, pastel gradients",
];

export function weeklyBackgroundUrl(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const motif = POSTMODERN_MOTIFS[h % POSTMODERN_MOTIFS.length];
  const prompt =
    `abstract postmodern background pattern, ${motif}, deep navy blue and indigo, ` +
    `dark moody background, glowing cyan and violet accent lines, fine grain texture, ` +
    `luminous high-contrast pattern on very dark navy, no text, no faces, no logo`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=1280&height=832&nologo=true&seed=${h % 100000}&model=flux`;
}
