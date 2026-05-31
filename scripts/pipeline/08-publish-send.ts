// 발행·발송 — git push(→Vercel 배포) + 배포 확인 + 구독자 메일 발송(PDF 첨부).
import "@/lib/load-env";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getAdminSupabase } from "@/lib/supabase";
import { sendIssueEmail, type Recipient } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/env";
import { issueJsonPath, readJson } from "@/lib/paths";
import type { Issue } from "@/types/issue";

/** content/ 변경을 커밋·push (→ Vercel 자동 배포) */
export function publishToGit(slug: string): void {
  const cwd = process.cwd();
  execFileSync("git", ["add", "content/"], { cwd, stdio: "inherit" });
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
  const link = `${site}/issues/${issue.meta.slug}`;
  const unsub = r.unsubscribeToken
    ? `${site}/api/unsubscribe?token=${r.unsubscribeToken}`
    : site;
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#fafaf7;font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1a1a1a">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px">
    <p style="color:#c8102e;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px">KCT · 주간 한국 문화 매거진</p>
    <h1 style="font-size:24px;line-height:1.3;margin:0 0 10px">${issue.meta.title}</h1>
    <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px">${issue.meta.dek}</p>
    <a href="${link}" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">웹에서 전체 보기 →</a>
    <p style="color:#555;font-size:14px;margin:22px 0 0">이번 호 전문은 첨부된 <strong>PDF</strong>로도 확인하실 수 있습니다.</p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:26px 0"/>
    <p style="font-size:12px;color:#999;margin:0">매주 발행되는 한국 문화 큐레이션 매거진입니다.<br/>
      <a href="${unsub}" style="color:#999">수신거부</a></p>
  </div></body></html>`;
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

export async function sendToSubscribers(
  slug: string,
  pdfPath?: string,
): Promise<void> {
  const issue = readJson<Issue>(issueJsonPath(slug));
  const site = getSiteUrl();
  const recipients = await getConfirmedSubscribers();
  if (recipients.length === 0) {
    console.log("구독자 없음 — 발송 생략");
    return;
  }
  const pdf =
    pdfPath && fs.existsSync(pdfPath)
      ? { filename: `KCT-${slug}.pdf`, content: fs.readFileSync(pdfPath) }
      : undefined;

  const result = await sendIssueEmail({
    recipients,
    subject: `[KCT] ${issue.meta.title}`,
    buildHtml: (r) => buildHtml(issue, site, r),
    pdf,
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
  const pdfPath = process.argv[3];
  sendToSubscribers(slug, pdfPath).catch((e) => {
    console.error("❌ 발송 실패:", e);
    process.exit(1);
  });
}
