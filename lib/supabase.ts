// Supabase 클라이언트 — 구독자 DB + 관리자 Auth + Storage(PDF).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/** 공개(anon) 클라이언트 — 구독 신청 등 */
export function getBrowserSupabase(): SupabaseClient | null {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  return createClient(url, anon);
}

/** 서버 전용(service role) 클라이언트 — ⚠️ 클라이언트 번들에 노출 금지 */
export function getAdminSupabase(): SupabaseClient | null {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSupabaseConfigured(): boolean {
  return (
    !!getEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    !!getEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}
