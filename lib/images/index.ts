// 계층형 이미지 디스패처: ImagePlan(팀원4) → ImageAsset.
// 의도별 우선 소스 + 실패 시 graceful fallback. 모두 무료·저작권 안전.
import type { ImageAsset } from "@/types/issue";
import type { ImagePlan } from "@/types/pipeline";
import { pollinationsUrl } from "@/lib/images/pollinations";
import { searchPexels } from "@/lib/images/pexels";
import { searchWikimedia } from "@/lib/images/wikimedia";

function aiAsset(
  plan: ImagePlan,
  seed: number,
  w = 1024,
  h = 576,
): ImageAsset {
  return {
    url: pollinationsUrl(plan.query, seed, w, h),
    kind: "ai",
    isAI: true,
    license: "AI-generated (Pollinations)",
    caption: plan.caption,
    alt: plan.alt,
  };
}

export async function resolveImage(
  plan: ImagePlan,
  seed: number,
  size?: { w: number; h: number },
): Promise<ImageAsset> {
  const w = size?.w ?? 1024;
  const h = size?.h ?? 576;
  const cap = { caption: plan.caption, alt: plan.alt };

  // 합법 임베드 이미지 없음 → 링크형
  if (plan.intent === "link") {
    return { url: "", kind: "link", isAI: false, sourceLink: plan.sourceLink, ...cap };
  }

  // 실존 인물·장소·사건 → Wikimedia CC 우선
  if (plan.intent === "wikimedia") {
    const w1 = await searchWikimedia(plan.query);
    if (w1)
      return {
        url: w1.url,
        kind: "wikimedia",
        isAI: false,
        attribution: w1.attribution,
        license: w1.license,
        ...cap,
      };
    const s = await searchPexels(plan.query);
    if (s)
      return {
        url: s.url,
        kind: "stock",
        isAI: false,
        attribution: s.attribution,
        license: "Pexels License",
        ...cap,
      };
    return aiAsset(plan, seed, w, h);
  }

  // 분위기·배경 → 스톡(Pexels) 우선
  if (plan.intent === "stock") {
    const s = await searchPexels(plan.query);
    if (s)
      return {
        url: s.url,
        kind: "stock",
        isAI: false,
        attribution: s.attribution,
        license: "Pexels License",
        ...cap,
      };
    return aiAsset(plan, seed, w, h);
  }

  // 개념·추상 → AI 생성(Pollinations; GOOGLE_GEMINI는 README 참고하여 교체 가능)
  return aiAsset(plan, seed, w, h);
}
