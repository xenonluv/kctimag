// LLM(claude -p) 출력 검증용 zod 스키마. types/* 와 대응.
import { z } from "zod";

export const IntensitiesSchema = z.object({
  news: z.number().min(0).max(100),
  psychological: z.number().min(0).max(100),
  realtime: z.number().min(0).max(100),
});

// 팀원2 분석 출력
export const AnalyzedIssueSchema = z.object({
  rank: z.number(),
  heading: z.string(),
  category: z.string(),
  summary: z.string(),
  intensities: IntensitiesSchema,
  score: z.number(),
  rationale: z.string(),
  sourceIndexes: z.array(z.number()),
});
export const AnalysisSchema = z.object({
  issues: z.array(AnalyzedIssueSchema),
});

export const SourceRefSchema = z.object({
  title: z.string(),
  link: z.string(),
  pubDate: z.string().optional(),
});

// 팀원3 작문 출력 (이미지 제외 — 이미지는 팀원4가 추가)
export const WrittenSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  rank: z.number(),
  intensities: IntensitiesSchema,
  category: z.string(),
  bodyMarkdown: z.string(),
  pullQuote: z.string().optional(),
  sources: z.array(SourceRefSchema),
});
export const WrittenIssueSchema = z.object({
  meta: z.object({
    title: z.string(),
    dek: z.string(),
  }),
  sections: z.array(WrittenSectionSchema),
});

// 팀원4 이미지 계획 출력
export const ImagePlanSchema = z.object({
  sectionId: z.string(),
  intent: z.enum(["stock", "wikimedia", "ai", "link"]),
  query: z.string(),
  caption: z.string(),
  alt: z.string(),
  sourceLink: z.string().optional(),
});
export const ImagePlanListSchema = z.object({
  cover: ImagePlanSchema,
  sections: z.array(ImagePlanSchema),
});

// 팀장 총평 출력
export const EditorialSchema = z.object({
  title: z.string(),
  bodyMarkdown: z.string(),
  author: z.string(),
});

export type WrittenIssue = z.infer<typeof WrittenIssueSchema>;
export type ImagePlanList = z.infer<typeof ImagePlanListSchema>;
