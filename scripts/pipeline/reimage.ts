// 재이미지 유틸 — 기존 issue.json의 imageQuery/imagePrompt로 이미지만 다시 채운다(재큐레이션 X).
// 이미지 전략(소스 순서 등)을 콘텐츠 변경 없이 빠르게 반복 검증할 때 사용.
//   tsx scripts/pipeline/reimage.ts [slug]
import "@/lib/load-env";
import { addImages } from "./04-images";
import { readJson, writeJson, issueJsonPath } from "@/lib/paths";
import type { Issue } from "@/types/issue";
import type { CuratedDoc } from "./02-curate";

const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
const issue = readJson<Issue>(issueJsonPath(slug));

// issue.json → CuratedDoc 형태로 어댑트(같은 객체 참조라 addImages가 in-place로 image를 채움)
const doc: CuratedDoc = {
  title: issue.meta.title,
  dek: issue.meta.dek,
  categories: issue.categories,
  editorPick: issue.editorPick,
  editorial: issue.editorial ?? { title: "", bodyMarkdown: "" },
};

addImages(doc)
  .then(() => {
    issue.meta.coverImageUrl = doc.editorPick.image?.url;
    writeJson(issueJsonPath(slug), issue);
    const n = issue.categories.reduce((s, c) => s + c.entries.length, 0);
    console.log(`✅ 재이미지 완료: ${n + 1}개 → ${issueJsonPath(slug)}`);
  })
  .catch((e) => {
    console.error("❌ 재이미지 실패:", e);
    process.exit(1);
  });
