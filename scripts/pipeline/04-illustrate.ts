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
  "당신은 매거진 포토 에디터다. 매거진은 **실제 사진 중심**이다. 각 섹션에 어울리는 " +
  "고품질 사진을 무료·저작권 안전 소스(stock/Wikimedia)에서 찾을 검색어를 만든다. " +
  "AI 생성은 최후수단이며, 실존 인물을 가짜 사진처럼 만들지 않는다.";

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
      intent: "stock",
      query: "seoul city culture night",
      caption: "이번 호",
      alt: "서울 도심 야경",
    },
    sections: doc.sections.map((s) => ({
      sectionId: s.id,
      intent: "stock" as const,
      query: "korean culture performance stage",
      caption: `${s.heading}`,
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
      `원칙: 매거진은 **실제 사진 중심**이다. 가능한 한 stock/wikimedia(실사진)를 선택하고 AI는 최소화.\n` +
      `intent 선택:\n` +
      `- "stock"(우선): 분위기·배경·상징을 담은 사진. query=구체적이고 고품질인 **영어** 사진 검색어(예: "kpop concert stage crowd lights", "korean traditional hanok village").\n` +
      `- "wikimedia": 실존 인물·장소·사건·작품의 사실 사진. query=실제 대상명.\n` +
      `- "ai"(최후수단): 사진으로 표현 불가능한 추상 개념에만. query=영어 개념 묘사. ⚠️ 실존 인물 가짜 사진 금지.\n` +
      `- "link": 합법 이미지가 전혀 없을 때만. sourceLink 필요.\n\n` +
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
