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
  "당신은 한국 문화 매거진의 깐깐한 큐레이션 데스크다. 한 주간 쏟아진 노이즈 많은 뉴스 후보에서 " +
  "정말 중요한 것만 안목 있게 골라낸다. 화보·외모·일상 사진, 단순 근황·출연, 홍보성 기사, " +
  "문화와 무관한 정치·사건사고는 단호히 버린다. 전국·글로벌 반향과 산업 영향이 큰 뉴스를 우선하며, " +
  "수집 쿼리가 아니라 기사 내용으로 카테고리를 판단한다.";

const PER_CAT = Number(process.env.CURATE_PER_CAT || 20); // 카테고리별 상위 N건 균형 샘플
const MAX_INPUT = Number(process.env.CURATE_MAX_INPUT || 400); // 전체 입력 상한

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

function toEntry(
  pool: RawNews["items"],
  index: number,
  blurb: string,
): NewsEntry | null {
  const it = pool[index];
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
  // 카테고리별 균형 샘플 — raw.items 는 카테고리 순으로 쌓여 있어 slice(0,N)은 첫 카테고리에 편중된다.
  const byCat = new Map<string, RawNews["items"]>();
  for (const it of raw.items) {
    const arr = byCat.get(it.categoryLabel) ?? [];
    arr.push(it);
    byCat.set(it.categoryLabel, arr);
  }
  let items: RawNews["items"] = [];
  for (const arr of byCat.values()) items.push(...arr.slice(0, PER_CAT));
  items = items.slice(0, MAX_INPUT);

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
      { key: "kpop", entries: [{ index: 0, blurb: "(mock) 설명", imagePrompt: "kpop concert stage", imageQuery: "kpop concert stage" }], note: "(mock) 이번 주 K-pop 선정 이유" },
      { key: "screen", entries: [{ index: 1, blurb: "(mock) 설명", imagePrompt: "film production set", imageQuery: "film set" }], note: "(mock) 이번 주 영화 선정 이유" },
    ],
    editorPick: { index: 0, why: "(mock) 이번 주 가장 큰 이슈로 선정.", imagePrompt: "korean culture concept", imageQuery: "korean culture" },
    editorial: { title: "이번 주 흐름", body: "(mock) 이번 주 문화 트렌드 총평." },
  };

  const result = await llmJson(
    `다음은 최근 한 주간 수집된 한국 문화 관련 뉴스 후보다(인덱스 포함). 노이즈가 많으니 안목 있게 골라라.\n\n${list}\n\n` +
      `【선정 기준 — 중요도 순】\n` +
      `- 전국적·글로벌 반향, 산업·사회적 영향, 신기록·수상·차트 성과, 주요 아티스트·작품·기업의 의미 있는 소식, 대중 화제성 큰 것을 우선.\n` +
      `- BTS·블랙핑크 등 글로벌급 뉴스나 업계 판도를 바꾸는 소식이 있으면 반드시 상위로.\n` +
      `【반드시 제외】\n` +
      `- 화보·패션·외모 묘사·직캠·일상 사진, 단순 출연·근황·SNS 소식 등 저가치 기사.\n` +
      `- 단순 신제품 나열 등 홍보성 보도자료.\n` +
      `- 문화와 무관한 기사(정치·선거·공약, 사건사고, 일반 경제/증시 등) → 키워드가 걸렸어도 버려라.\n` +
      `【카테고리】 수집 쿼리는 무시하고 **기사 내용으로 올바른 카테고리**를 배정. 맞는 카테고리가 없으면 제외. key는 다음만: ${keys}\n\n` +
      `할 일:\n` +
      `1. 카테고리별 대표 뉴스 2~5건 선별(같은 사건 중복은 가장 대표적 1건만).\n` +
      `2. 각 항목 blurb = **2~3문장**(무슨 일 + 맥락 + 왜 중요한지). 짧게 쓰지 말 것.\n` +
      `3. 각 항목 imagePrompt = 그 기사를 상징하는 **영어 이미지 생성 프롬프트**(개념·분위기 일러스트. ⚠️실존 인물 얼굴·로고·텍스트 금지. 예: "kpop idol group silhouette on a glowing stage, fans cheering").\n` +
      `3-1. 각 항목 imageQuery = 스톡/위키 **사진 검색용 구체 영어 키워드**(실제 주제·장소·작품·사물의 명사 위주. 예: "Gyeongbokgung palace night", "esports arena crowd", "Korean street food market"). 추상 표현 말고 검색에 바로 쓸 구체 명사로.\n` +
      `4. editorPick = 전체에서 이번 주 "가장 큰 이슈" 1건 + why(3~5문장) + imagePrompt + imageQuery.\n` +
      `5. title(호 제목) + dek(부제).\n` +
      `6. editorial = 이번 주 문화 흐름 전반 총평. title + body. ⚠️body는 반드시 **600자 이상 900자 이하**(한국어, 공백 포함), **3개 문단 이상**으로 충분히 길게. 단순 나열이 아니라 한 주를 관통하는 흐름·맥락·전망을 담은 통찰적인 에세이로. 너무 짧으면 다시 써라.\n` +
      `7. 각 카테고리마다 note = **이번 주 이 카테고리에서 왜 이 뉴스들을 골랐는지** 1~2문장 큐레이션 코멘트(개별 기사 요약 반복 금지. 이 섹션의 이번 주 흐름·선정 관점·의미를 독자에게 말하듯 간결히).\n\n` +
      `index는 0~${items.length - 1} 정수만 사용.\n` +
      `형식: {"title","dek","categories":[{"key","entries":[{"index","blurb","imagePrompt","imageQuery"}],"note"}],"editorPick":{"index","why","imagePrompt","imageQuery","honorableIndexes":[]},"editorial":{"title","body"}}`,
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
      const entry = toEntry(items, e.index, e.blurb);
      if (!entry || seen.has(entry.link)) continue;
      entry.imagePrompt = e.imagePrompt;
      entry.imageQuery = e.imageQuery;
      seen.add(entry.link);
      entries.push(entry);
    }
    if (entries.length)
      categories.push({ key: cat.key, label: labelOf(cat.key), entries, note: cat.note });
  }

  const pickItem = items[result.editorPick.index];
  const pickLink = pickItem ? pickItem.originallink || pickItem.link : "";
  const editorPick: EditorPick = {
    headline: pickItem?.title ?? "이번 주의 픽",
    link: pickLink,
    outlet: outletFromUrl(pickLink),
    why: result.editorPick.why,
    imagePrompt: result.editorPick.imagePrompt,
    imageQuery: result.editorPick.imageQuery,
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
