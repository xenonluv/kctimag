// 팀원2+3 — Curator (큐레이션)
// 수집 뉴스에서 카테고리별 대표 항목을 선별하고, 이번 주 최대 이슈(편집장 픽)를 뽑는다.
// AI 합성 기사 대신 "실제 뉴스 목록 + 1줄 설명 + 편집장 픽" 다이제스트를 만든다.
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { llmJson } from "@/lib/llm";
import { CurateSchema, type Curate } from "@/lib/schemas";
import { CULTURE_CATEGORIES } from "@/lib/categories";
import { outletFromUrl } from "@/lib/og-image";
import { readJson, writeJson, tmpDir } from "@/lib/paths";
import type { RawNews } from "@/types/pipeline";
import type {
  CategorySection,
  EditorPick,
  EditorialNote,
  NewsEntry,
} from "@/types/issue";

const CURATOR_SYS =
  "당신은 한국 문화 매거진의 큐레이션 에디터다. 한 주간 쏟아진 문화 뉴스에서 정말 주목할 만한 것을 " +
  "골라 카테고리별로 정리하고, 이번 주 가장 중요한 이슈 하나를 선정해 그 이유를 설명한다. " +
  "사실에 근거하며, 같은 사건의 중복 기사는 하나만 고른다.";

const MAX_INPUT = 300;

export interface CuratedDoc {
  title: string;
  dek: string;
  categories: CategorySection[];
  editorPick: EditorPick;
  editorial: EditorialNote;
}

function labelOf(key: string): string {
  return CULTURE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function toEntry(raw: RawNews, index: number, blurb: string): NewsEntry | null {
  const it = raw.items[index];
  if (!it) return null;
  const link = it.originallink || it.link;
  return {
    headline: it.title,
    link,
    outlet: outletFromUrl(link),
    pubDate: it.pubDate,
    blurb,
  };
}

export async function curate(raw: RawNews): Promise<CuratedDoc> {
  const items = raw.items.slice(0, MAX_INPUT);
  const list = items
    .map(
      (it, i) =>
        `${i}. [${it.categoryLabel}] ${it.title} — ${it.description.slice(0, 80)}`,
    )
    .join("\n");
  const keys = CULTURE_CATEGORIES.map((c) => c.key).join(", ");

  const mock: Curate = {
    title: "이번 주 한국 문화",
    dek: "한 주간의 문화 뉴스 다이제스트",
    categories: [
      { key: "kpop", entries: [{ index: 0, blurb: "(mock) 설명" }] },
      { key: "screen", entries: [{ index: 1, blurb: "(mock) 설명" }] },
    ],
    editorPick: { index: 0, why: "(mock) 이번 주 가장 큰 이슈로 선정." },
    editorial: { title: "이번 주 흐름", body: "(mock) 이번 주 문화 트렌드 총평." },
  };

  const result = await llmJson(
    `다음은 최근 한 주간 수집된 한국 문화 뉴스 목록이다(인덱스 포함).\n\n${list}\n\n` +
      `할 일:\n` +
      `1. 카테고리별로 이번 주 가장 주목할 뉴스 3~5건을 선별(같은 사건 중복은 가장 대표적인 1건만).\n` +
      `2. 각 항목에 **2~3문장**의 충실한 blurb(무슨 일인지 + 맥락·배경 + 왜 주목할지). 너무 짧게 쓰지 말 것.\n` +
      `3. 전체에서 이번 주 "가장 큰 이슈" 기사 1건을 editorPick으로 선정하고, why를 3~5문장으로(왜 이걸 최대 이슈로 채택했는지).\n` +
      `4. 호 제목(title)과 부제(dek).\n` +
      `5. **편집장 총평(editorial)**: 이번 주 한국 문화 흐름 전반을 짚는 글. title + body(500~800자). 개별 뉴스 나열이 아니라 흐름·맥락·의미를 통찰력 있게.\n\n` +
      `카테고리 key는 다음만 사용: ${keys}\n` +
      `index는 위 목록의 정수만 사용(0~${items.length - 1}).\n` +
      `형식: {"title","dek","categories":[{"key","entries":[{"index","blurb"}]}],"editorPick":{"index","why","honorableIndexes":[]},"editorial":{"title","body"}}`,
    CurateSchema,
    { system: CURATOR_SYS },
    mock,
  );

  // 조립
  const categories: CategorySection[] = [];
  for (const cat of result.categories) {
    const entries: NewsEntry[] = [];
    const seen = new Set<string>();
    for (const e of cat.entries) {
      const entry = toEntry(raw, e.index, e.blurb);
      if (!entry || seen.has(entry.link)) continue;
      seen.add(entry.link);
      entries.push(entry);
    }
    if (entries.length) categories.push({ key: cat.key, label: labelOf(cat.key), entries });
  }

  const pickItem = items[result.editorPick.index];
  const pickLink = pickItem ? pickItem.originallink || pickItem.link : "";
  const editorPick: EditorPick = {
    headline: pickItem?.title ?? "이번 주의 픽",
    link: pickLink,
    outlet: outletFromUrl(pickLink),
    why: result.editorPick.why,
    honorableMentions: (result.editorPick.honorableIndexes ?? [])
      .map((i) => items[i])
      .filter(Boolean)
      .map((it) => ({ headline: it.title, link: it.originallink || it.link })),
  };

  return {
    title: result.title,
    dek: result.dek,
    categories,
    editorPick,
    editorial: {
      title: result.editorial.title,
      bodyMarkdown: result.editorial.body,
    },
  };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  const raw = readJson<RawNews>(path.join(tmpDir(slug), "raw-news.json"));
  curate(raw)
    .then((doc) => {
      const out = path.join(tmpDir(slug), "curated.json");
      writeJson(out, doc);
      const n = doc.categories.reduce((s, c) => s + c.entries.length, 0);
      console.log(
        `✅ 큐레이션 완료: ${doc.categories.length}개 카테고리 · ${n}개 항목 · 픽 "${doc.editorPick.headline}" → ${out}`,
      );
    })
    .catch((e) => {
      console.error("❌ 큐레이션 실패:", e);
      process.exit(1);
    });
}
