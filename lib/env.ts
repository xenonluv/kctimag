// 환경변수 접근 헬퍼.

export function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v || v.trim() === "") {
    throw new Error(`필수 환경변수 누락: ${key} (.env.local 확인)`);
  }
  return v;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/** 키가 비어있으면 해당 기능을 건너뛰도록 판단하는 헬퍼 */
export function hasEnv(key: string): boolean {
  const v = process.env[key];
  return !!v && v.trim() !== "";
}
