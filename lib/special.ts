// 웹앱이 발행된 특별기획(content/special)을 읽는 유틸. (서버 컴포넌트 전용 — fs 사용)
import fs from "node:fs";
import path from "node:path";
import { SPECIAL_DIR, specialDir, specialJsonPath } from "@/lib/paths";
import type { SpecialArticle, SpecialIndexEntry } from "@/types/special";

export function allSpecialSlugs(): string[] {
  if (!fs.existsSync(SPECIAL_DIR)) return [];
  return fs
    .readdirSync(SPECIAL_DIR)
    .filter((d) => fs.existsSync(specialJsonPath(d)));
}

export function readSpecial(slug: string): SpecialArticle | null {
  const p = specialJsonPath(slug);
  if (!fs.existsSync(p)) return null;
  try {
    const article = JSON.parse(fs.readFileSync(p, "utf-8")) as SpecialArticle;
    // 긴 본문은 형제 body.md 로 분리 관리(누적 집필 용이). bodyMarkdown이 비었으면 폴백.
    if (!article.bodyMarkdown || article.bodyMarkdown.trim() === "") {
      const mdPath = path.join(specialDir(slug), "body.md");
      if (fs.existsSync(mdPath)) {
        article.bodyMarkdown = fs.readFileSync(mdPath, "utf-8");
      }
    }
    return article;
  } catch {
    return null;
  }
}

export function listSpecials(): SpecialIndexEntry[] {
  const entries: SpecialIndexEntry[] = [];
  for (const slug of allSpecialSlugs()) {
    const article = readSpecial(slug);
    if (!article) continue;
    entries.push({
      slug,
      title: article.meta.title,
      dek: article.meta.dek,
      date: article.meta.date,
      kicker: article.meta.kicker ?? "특별기획",
      coverImageUrl: article.meta.coverImageUrl ?? "",
    });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return entries;
}

export function latestSpecial(): SpecialArticle | null {
  const list = listSpecials();
  return list.length ? readSpecial(list[0].slug) : null;
}
