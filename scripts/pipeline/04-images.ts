// 팀원4 — Images (무료·합법)
// 항목별로 Pexels(무료 스톡 실사진) → Pollinations(AI 개념) 순으로 시도.
// (Wikimedia는 서술형 쿼리에 무관한 옛 자료가 많아 기본 체인에서 제외 — lib/images/wikimedia.ts 는 보존.)
// → 기사 사진 미사용(저작권 안전), 모든 이미지에 출처 라벨, URL 중복 방지.
// IMAGE_PHOTOS=0 이면 스톡을 건너뛰고 전부 AI로 생성.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pollinationsUrl } from "@/lib/images/pollinations";
import { searchPexels } from "@/lib/images/pexels";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { EntryImage } from "@/types/issue";
import type { CuratedDoc } from "./02-curate";

const USE_PHOTOS = process.env.IMAGE_PHOTOS !== "0"; // 기본 레이어드, "0"이면 AI 전용

let seedCounter = 1;
const usedUrls = new Set<string>();

// 레이어드: Wikimedia(실사진) → Pexels(스톡) → Pollinations(AI 폴백). 첫 성공·미중복 URL 사용.
async function resolveImage(
  query: string | undefined,
  prompt: string | undefined,
  fallback: string,
  size?: { w: number; h: number },
): Promise<EntryImage> {
  const q = (query || "").trim();
  if (USE_PHOTOS && q) {
    try {
      const p = await searchPexels(q, size);
      if (p && !usedUrls.has(p.url)) {
        usedUrls.add(p.url);
        return { url: p.url, source: p.attribution };
      }
    } catch {
      /* AI 폴백 */
    }
  }
  // AI 폴백 (개념·분위기, 항목마다 고유 시드 → 중복 없음)
  const ai = prompt && prompt.trim() ? prompt.trim() : fallback;
  const url = pollinationsUrl(ai, seedCounter++, size?.w ?? 640, size?.h ?? 360);
  usedUrls.add(url);
  return { url, source: "AI 생성 이미지" };
}

export async function addImages(doc: CuratedDoc): Promise<CuratedDoc> {
  seedCounter = 1;
  usedUrls.clear();
  doc.editorPick.image = await resolveImage(
    doc.editorPick.imageQuery,
    doc.editorPick.imagePrompt,
    doc.editorPick.headline,
    { w: 800, h: 450 },
  );
  for (const cat of doc.categories) {
    for (const e of cat.entries) {
      e.image = await resolveImage(e.imageQuery, e.imagePrompt, `${cat.label} concept`);
    }
  }
  return doc;
}

/** 출처별 집계(검증·로그용) */
function sourceStats(doc: CuratedDoc): Record<string, number> {
  const all: (EntryImage | undefined)[] = [
    doc.editorPick.image,
    ...doc.categories.flatMap((c) => c.entries.map((e) => e.image)),
  ];
  const stat: Record<string, number> = { Pexels: 0, AI: 0 };
  for (const img of all) {
    if (!img) continue;
    if (img.source.includes("Pexels")) stat.Pexels++;
    else stat.AI++;
  }
  return stat;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const doc = readJson<CuratedDoc>(path.join(tmpDir(slug), "curated.json"));
  addImages(doc)
    .then((out) => {
      const dest = path.join(tmpDir(slug), "illustrated.json");
      writeJson(dest, out);
      const n = out.categories.reduce((s, c) => s + c.entries.length, 0);
      const st = sourceStats(out);
      console.log(
        `✅ 이미지 ${n + 1}개 (Pexels ${st.Pexels} · AI ${st.AI}) → ${dest}`,
      );
    })
    .catch((e) => {
      console.error("❌ 이미지 실패:", e);
      process.exit(1);
    });
}
