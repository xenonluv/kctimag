import path from "node:path";
import fs from "node:fs";

/** 프로젝트 루트 (Next.js·파이프라인 모두 cwd = 루트) */
export const ROOT = process.cwd();

/** 발행된 호 콘텐츠 디렉터리 (git에 커밋됨) */
export const CONTENT_DIR = path.join(ROOT, "content", "issues");

/** 발행된 이벤트 콘텐츠 디렉터리 (git에 커밋됨) */
export const EVENTS_DIR = path.join(ROOT, "content", "events");

/** 발행된 특별기획 콘텐츠 디렉터리 (git에 커밋됨) */
export const SPECIAL_DIR = path.join(ROOT, "content", "special");

/** 파이프라인 중간 산출물 (gitignore됨) */
export const TMP_ROOT = path.join(ROOT, ".pipeline-tmp");

export function issueDir(slug: string): string {
  return path.join(CONTENT_DIR, slug);
}

export function issueJsonPath(slug: string): string {
  return path.join(issueDir(slug), "issue.json");
}

export function eventDir(slug: string): string {
  return path.join(EVENTS_DIR, slug);
}

export function eventJsonPath(slug: string): string {
  return path.join(eventDir(slug), "events.json");
}

export function specialDir(slug: string): string {
  return path.join(SPECIAL_DIR, slug);
}

export function specialJsonPath(slug: string): string {
  return path.join(specialDir(slug), "article.json");
}

export function tmpDir(slug: string): string {
  return path.join(TMP_ROOT, slug);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** 객체를 JSON 파일로 저장 (디렉터리 자동 생성) */
export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/** JSON 파일 읽기 */
export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}
