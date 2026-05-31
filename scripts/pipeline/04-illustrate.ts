// 팀원4 — Illustrator (이미지)
// Claude가 이미지 '성격'을 판단해 계획 → 계층형 디스패처가 무료·저작권 안전 소스로 해결.
// (Claude는 이미지 생성 불가 → 판단·프롬프트만. 실제 이미지는 Pexels/Wikimedia/Pollinations.)
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmJson } from "@/lib/llm";
import { ImagePlanListSchema, type ImagePlanList } from "@/lib/schemas";
import { resolveImage } from "@/lib/images";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { ImageAsset, IssueSection } from "@/types/issue";
import type { WrittenDoc } from "./03-write";

const ILLUSTRATE_SYS =
  "당신은 매거진 아트디렉터다. 각 섹션에 맞는 이미지의 '성격'을 판단하고, 무료·저작권 안전 소스로 " +
  "연결될 검색어/생성 프롬프트를 만든다. 실존 인물을 가짜 사진처럼 AI 생성하지 않는다.";

export interface IllustratedDoc {
  title: string;
  dek: string;
  coverImage: ImageAsset;
  sections: IssueSection[];
}

function mockPlan(doc: WrittenDoc): ImagePlanList {
  return {
    cover: {
      sectionId: "cover",
      intent: "ai",
      query: "korean culture magazine cover collage, editorial, vibrant",
      caption: "이번 호 표지",
      alt: "한국 문화 매거진 표지 일러스트",
    },
    sections: doc.sections.map((s) => ({
      sectionId: s.id,
      intent: "ai" as const,
      query: `${s.category} concept illustration, editorial, abstract`,
      caption: `${s.heading} 관련 이미지`,
      alt: s.heading,
    })),
  };
}

export async function illustrate(doc: WrittenDoc): Promise<IllustratedDoc> {
  const brief = doc.sections
    .map((s) => `id=${s.id} | ${s.heading} (${s.category})`)
    .join("\n");

  const plan = await llmJson(
    `매거진 호 "${doc.title}"의 표지(cover)와 각 섹션 이미지 1개씩을 계획하라.\n섹션:\n${brief}\n\n` +
      `intent를 신중히 선택(저작권·사실성 고려):\n` +
      `- "wikimedia": 실존 인물·장소·사건 등 사실 이미지가 필요할 때. query=실제 대상명(한국어/영어).\n` +
      `- "stock": 분위기·배경. query=영어 키워드 권장.\n` +
      `- "ai": 개념·추상. query=영어 생성 프롬프트. ⚠️ 실존 인물의 가짜 사진 생성 금지.\n` +
      `- "link": 합법 이미지가 없고 원문 사진만 있을 때. sourceLink 필요.\n\n` +
      `형식: {"cover":{"sectionId":"cover","intent":"...","query":"...","caption":"...","alt":"..."},` +
      `"sections":[{"sectionId":"<섹션 id>","intent":"...","query":"...","caption":"...","alt":"...","sourceLink":"(선택)"}]}\n` +
      `sections 배열은 위 섹션과 동일한 id로 동일 개수.`,
    ImagePlanListSchema,
    { system: ILLUSTRATE_SYS },
    mockPlan(doc),
  );

  const coverImage = await resolveImage(plan.cover, 1000, { w: 1200, h: 675 });

  const sections = await Promise.all(
    doc.sections.map(async (s, i) => {
      const p =
        plan.sections.find((pl) => pl.sectionId === s.id) ?? plan.sections[i];
      if (!p) return s;
      const img = await resolveImage(p, 100 + i);
      return { ...s, images: [img] };
    }),
  );

  return { title: doc.title, dek: doc.dek, coverImage, sections };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const doc = readJson<WrittenDoc>(path.join(tmpDir(slug), "written.json"));
  illustrate(doc)
    .then((out) => {
      const dest = path.join(tmpDir(slug), "illustrated.json");
      writeJson(dest, out);
      console.log(`✅ 이미지 완료: 표지 + ${out.sections.length}섹션 → ${dest}`);
    })
    .catch((e) => {
      console.error("❌ 이미지 실패:", e);
      process.exit(1);
    });
}
