// LLM(claude -p) 큐레이션 출력 검증용 zod 스키마.
// 02-curate: 수집된 뉴스(인덱스 부여)에서 카테고리별 대표 항목 선별 + 편집장 픽.
import { z } from "zod";

export const CurateEntrySchema = z.object({
  /** 입력 뉴스 목록에서의 인덱스 */
  index: z.number().int(),
  /** 1~2줄 설명 */
  blurb: z.string(),
  /** AI 이미지 생성용 영어 프롬프트(개념·분위기 일러스트, 실존 인물 얼굴 금지) */
  imagePrompt: z.string(),
  /** 스톡/위키 사진 검색용 영어 키워드(구체 명사: 실주제·장소·작품, 예 "Gyeongbokgung palace") */
  imageQuery: z.string().optional(),
});

export const CurateCategorySchema = z.object({
  key: z.string(),
  entries: z.array(CurateEntrySchema),
  /** 이번 주 이 카테고리에서 이 뉴스들을 고른 이유(큐레이터 의견, 1~2문장) */
  note: z.string().optional(),
});

export const CurateSchema = z.object({
  title: z.string(),
  dek: z.string(),
  /** 홈 상단 자랑 영역 — 이번 주 전반 선정 이유(3문장 내외) */
  selectionRationale: z.string().optional(),
  categories: z.array(CurateCategorySchema),
  editorPick: z.object({
    index: z.number().int(),
    why: z.string(),
    imagePrompt: z.string(),
    imageQuery: z.string().optional(),
    honorableIndexes: z.array(z.number().int()).optional(),
  }),
  /** 편집장 총평 — 이번 주 문화 흐름 전반 */
  editorial: z.object({
    title: z.string(),
    body: z.string(),
  }),
});

export type Curate = z.infer<typeof CurateSchema>;
