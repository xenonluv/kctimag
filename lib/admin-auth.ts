// 관리자 인증 — 단일 관리자용 비밀번호 + httpOnly 서명 쿠키.
// (Supabase Auth로 업그레이드 가능 — README 참고)
import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-secret-change-me";
export const ADMIN_COOKIE = "kct_admin";

export function adminToken(): string {
  return crypto.createHmac("sha256", SECRET).update("kct-admin-v1").digest("hex");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  // 타이밍 공격 방지 비교
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isAdmin(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === adminToken();
}
