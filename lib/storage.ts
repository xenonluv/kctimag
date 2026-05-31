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
      cacheControl: "0",
      upsert: true,
    });
  if (error) throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  return predictedPdfUrl(slug);
}

/** 보존 정책 — keepSlugs(유지할 호 slug)에 없는 PDF를 Storage에서 삭제. 삭제된 slug 배열 반환.
 *  무료 한도 유지를 위해 주간 발행 시 호출(최근 N호만 보관). */
export async function pruneOldPdfs(keepSlugs: string[]): Promise<string[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error(`Storage 목록 조회 실패: ${error.message}`);
  if (!data) return [];
  const keep = new Set(keepSlugs.map((s) => `${s}.pdf`));
  const toDelete = data
    .filter((f) => f.name.endsWith(".pdf") && !keep.has(f.name))
    .map((f) => f.name);
  if (!toDelete.length) return [];
  const { error: delErr } = await sb.storage.from(BUCKET).remove(toDelete);
  if (delErr) throw new Error(`Storage 정리 실패: ${delErr.message}`);
  return toDelete.map((n) => n.replace(/\.pdf$/, ""));
}
