// 팀원4 — Images
// 각 뉴스 항목의 "기사 자체 이미지(og:image)"를 추출해 사용하고 출처(언론사)만 표기.
// 추출 실패 시 카테고리 키워드로 무료 스톡(Pexels) 폴백.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOgImage, outletFromUrl, stockFallback } from "@/lib/og-image";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { EntryImage } from "@/types/issue";
import type { CuratedDoc } from "./02-curate";

const STOCK_Q: Record<string, string> = {
  kpop: "kpop concert stage crowd",
  screen: "film drama production set",
  webtoon: "comic illustration drawing",
  beauty: "korean skincare cosmetics",
  food: "korean food table dishes",
  game: "esports gaming arena",
  tech: "robot technology laboratory",
  stage: "theater stage performance",
  heritage: "korean traditional hanok",
  life: "seoul street cafe trendy",
};

async function resolveImage(link: string, key: string): Promise<EntryImage | null> {
  if (link) {
    const og = await fetchOgImage(link).catch(() => null);
    if (og) {
      const outlet = outletFromUrl(link);
      return { url: og, source: outlet ? `사진: ${outlet}` : "사진: 기사 출처" };
    }
  }
  return stockFallback(STOCK_Q[key] ?? "korea culture seoul");
}

export async function addImages(doc: CuratedDoc): Promise<CuratedDoc> {
  // 편집장 픽
  if (doc.editorPick.link) {
    const img = await resolveImage(doc.editorPick.link, "life");
    if (img) doc.editorPick.image = img;
  }
  // 카테고리별 항목 (카테고리 단위 병렬)
  for (const cat of doc.categories) {
    await Promise.all(
      cat.entries.map(async (e) => {
        const img = await resolveImage(e.link, cat.key);
        if (img) e.image = img;
      }),
    );
  }
  return doc;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const doc = readJson<CuratedDoc>(path.join(tmpDir(slug), "curated.json"));
  addImages(doc)
    .then((out) => {
      const dest = path.join(tmpDir(slug), "illustrated.json");
      writeJson(dest, out);
      const withImg = out.categories.reduce(
        (s, c) => s + c.entries.filter((e) => e.image).length,
        0,
      );
      console.log(`✅ 이미지 완료: ${withImg}개 항목 이미지 → ${dest}`);
    })
    .catch((e) => {
      console.error("❌ 이미지 실패:", e);
      process.exit(1);
    });
}
