// LLM(claude -p) 큐레이션 출력 검증용 zod 스키마.
// 02-curate: 수집된 뉴스(인덱스 부여)에서 카테고리별 대표 항목 선별 + 편집장 픽.
import { z } from "zod";

export const CurateEntrySchema = z.object({
  /** 입력 뉴스 목록에서의 인덱스 */
  index: z.number().int(),
  /** 1~2줄 설명 */
  blurb: z.string(),
});

export const CurateCategorySchema = z.object({
  key: z.string(),
  entries: z.array(CurateEntrySchema),
});

export const CurateSchema = z.object({
  title: z.string(),
  dek: z.string(),
  categories: z.array(CurateCategorySchema),
  editorPick: z.object({
    index: z.number().int(),
    why: z.string(),
    honorableIndexes: z.array(z.number().int()).optional(),
  }),
  /** 편집장 총평 — 이번 주 문화 흐름 전반 */
  editorial: z.object({
    title: z.string(),
    body: z.string(),
  }),
});

export type Curate = z.infer<typeof CurateSchema>;
