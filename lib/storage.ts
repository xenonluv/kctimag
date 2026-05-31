// Supabase Storage — 발행 PDF 업로드 + 공개 URL.
// 사전에 'issues' 공개 버킷을 만들어 둘 것 (README 참고).
import fs from "node:fs";
import { getAdminSupabase } from "@/lib/supabase";
import { getEnv } from "@/lib/env";

const BUCKET = "issues";

/** 업로드 전에도 예측 가능한 공개 URL (공개 버킷 기준) */
export function predictedPdfUrl(slug: string): string | null {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${slug}.pdf`;
}

/** 로컬 PDF 파일을 Storage에 업로드 → 공개 URL 반환 (미설정 시 null) */
export async function uploadPdf(
  slug: string,
  filePath: string,
): Promise<string | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const data = fs.readFileSync(filePath);
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(`${slug}.pdf`, data, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  return predictedPdfUrl(slug);
}
