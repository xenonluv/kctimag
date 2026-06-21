// 발행·발송 — git push(→Vercel 배포) + 배포 확인 + 구독자 메일 발송(PDF 첨부).
import "@/lib/load-env";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getAdminSupabase } from "@/lib/supabase";
import { sendIssueEmail, unsubscribeUrl, type Recipient } from "@/lib/mailer";
import {
  renderIssueEmail,
  pickThemeIndexBySlug,
  escapeHtml,
  defaultEmailSubject,
} from "@/lib/email-template";
import { getSiteUrl } from "@/lib/env";
import { issueJsonPath, readJson } from "@/lib/paths";
import type { Issue } from "@/types/issue";

/** 발행 대상 호만 커밋·push (→ Vercel 자동 배포).
 *  ⚠️ content/ 전체가 아니라 해당 슬러그 디렉토리만 add — 작업트리에 남은
 *  미발행 테스트 호가 함께 휩쓸려 발행되는 사고를 방지한다. */
export function publishToGit(slug: string): void {
  const cwd = process.cwd();
  execFileSync("git", ["add", `content/issues/${slug}`], {
    cwd,
    stdio: "inherit",
  });
  if (fs.existsSync(`content/events/${slug}`)) {
    execFileSync("git", ["add", `content/events/${slug}`], {
      cwd,
      stdio: "inherit",
    });
  }
  execFileSync("git", ["commit", "-m", `발행: ${slug}호 한국 문화 매거진`], {
    cwd,
    stdio: "inherit",
  });
  execFileSync("git", ["push", "origin", "main"], { cwd, stdio: "inherit" });
}

/** 배포 완료까지 폴링 (issue 페이지 200) */
export async function pollDeploy(slug: string, timeoutMs = 180_000): Promise<boolean> {
  const url = `${getSiteUrl()}/issues/${slug}`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      /* 재시도 */
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return false;
}

function buildHtml(issue: Issue, site: string, r: Recipient): string {
  return renderIssueEmail({
    title: issue.meta.title,
    bodyHtml: escapeHtml(issue.meta.dek),
    ctaUrl: `${site}/`, // 홈(AI 엄선 자랑 카드)으로 — 거기서 최신호 히어로로 본문 진입
    ctaLabel: "웹에서 전체 보기 →",
    unsubUrl: unsubscribeUrl(site, r),
    themeIndex: pickThemeIndexBySlug(issue.meta.slug), // 주차별 자동 순환
  });
}

export async function getConfirmedSubscribers(): Promise<Recipient[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("subscribers")
    .select("email,unsubscribe_token")
    .eq("status", "confirmed");
  if (error) throw new Error(`구독자 조회 실패: ${error.message}`);
  return (data ?? []).map((d: { email: string; unsubscribe_token?: string }) => ({
    email: d.email,
    unsubscribeToken: d.unsubscribe_token,
  }));
}

export async function sendToSubscribers(slug: string): Promise<void> {
  const issue = readJson<Issue>(issueJsonPath(slug));
  const site = getSiteUrl();
  const recipients = await getConfirmedSubscribers();
  if (recipients.length === 0) {
    console.log("구독자 없음 — 발송 생략");
    return;
  }

  const result = await sendIssueEmail({
    recipients,
    subject: defaultEmailSubject(issue.meta.date),
    buildHtml: (r) => buildHtml(issue, site, r),
    throttleMs: 300,
  });
  console.log(`📧 발송 완료: 성공 ${result.sent} · 실패 ${result.failed}`);
  if (result.errors.length) console.warn("  오류:", result.errors.slice(0, 5));

  const sb = getAdminSupabase();
  if (sb) {
    await sb
      .from("send_logs")
      .insert({ issue_slug: slug, sent: result.sent, failed: result.failed });
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  sendToSubscribers(slug).catch((e) => {
    console.error("❌ 발송 실패:", e);
    process.exit(1);
  });
}
