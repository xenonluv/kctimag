// 웹앱이 발행된 호(content/issues)를 읽는 유틸. (서버 컴포넌트 전용 — fs 사용)
import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "@/lib/paths";
import type { Issue, IssueIndexEntry } from "@/types/issue";

export function allSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((d) => fs.existsSync(path.join(CONTENT_DIR, d, "issue.json")));
}

export function readIssue(slug: string): Issue | null {
  const p = path.join(CONTENT_DIR, slug, "issue.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Issue;
  } catch {
    return null;
  }
}

export function listIssues(): IssueIndexEntry[] {
  const entries: IssueIndexEntry[] = [];
  for (const slug of allSlugs()) {
    const issue = readIssue(slug);
    if (!issue) continue;
    entries.push({
      slug,
      title: issue.meta.title,
      dek: issue.meta.dek,
      date: issue.meta.date,
      coverImageUrl: issue.meta.coverImageUrl ?? "",
    });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return entries;
}

export function latestIssue(): Issue | null {
  const list = listIssues();
  return list.length ? readIssue(list[0].slug) : null;
}
