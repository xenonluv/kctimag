"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  adminToken,
  checkPassword,
  isAdmin,
} from "@/lib/admin-auth";
import { getAdminSupabase } from "@/lib/supabase";
import { readIssue } from "@/lib/content";
import { sendIssueEmail, type Recipient } from "@/lib/mailer";
import { getSiteUrl } from "@/lib/env";

export async function login(formData: FormData) {
  const pw = (formData.get("password") ?? "").toString();
  if (!checkPassword(pw)) redirect("/admin/login?error=1");
  const c = await cookies();
  c.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function deleteSubscriber(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = formData.get("id")?.toString();
  const sb = getAdminSupabase();
  if (sb && id) await sb.from("subscribers").delete().eq("id", id);
  redirect("/admin");
}

// 수동 재발송 (웹링크 + PDF 링크 메일 — 첨부 없이). 주간 자동 발송은 파이프라인이 PDF 첨부로 수행.
export async function resendIssue(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const slug = formData.get("slug")?.toString();
  const testEmail = formData.get("testEmail")?.toString().trim();
  const message = formData.get("message")?.toString().trim();
  const fromName = formData.get("fromName")?.toString().trim();
  if (!slug) redirect("/admin?msg=noslug");
  const issue = readIssue(slug!);
  const sb = getAdminSupabase();
  if (!issue) redirect("/admin?msg=noissue");

  const site = getSiteUrl();
  let recipients: Recipient[] = [];
  if (testEmail) {
    recipients = [{ email: testEmail }];
  } else if (sb) {
    const { data } = await sb
      .from("subscribers")
      .select("email,unsubscribe_token")
      .eq("status", "confirmed");
    recipients = (data ?? []).map(
      (d: { email: string; unsubscribe_token?: string }) => ({
        email: d.email,
        unsubscribeToken: d.unsubscribe_token,
      }),
    );
  }
  if (recipients.length === 0) redirect("/admin?msg=norecipients");

  const link = `${site}/issues/${issue!.meta.slug}`;
  const pdfUrl = issue!.meta.pdfUrl;

  // 호스팅된 PDF를 받아 첨부 (Vercel 서버리스엔 로컬 파일이 없으므로 Supabase에서 fetch)
  let pdf: { filename: string; content: Buffer } | undefined;
  if (pdfUrl) {
    try {
      const res = await fetch(pdfUrl);
      if (res.ok) {
        pdf = {
          filename: `KCT-${slug}.pdf`,
          content: Buffer.from(await res.arrayBuffer()),
        };
      }
    } catch {
      /* 첨부 실패 시 링크만 */
    }
  }

  await sendIssueEmail({
    recipients,
    subject: `[KCT] ${issue!.meta.title}`,
    fromName: fromName || undefined,
    throttleMs: 300,
    pdf,
    buildHtml: (r) => {
      const unsub = r.unsubscribeToken
        ? `${site}/api/unsubscribe?token=${r.unsubscribeToken}`
        : site;
      const pdfLine = pdf
        ? " · 📄 PDF가 첨부되어 있습니다"
        : pdfUrl
          ? ` · <a href="${pdfUrl}">PDF 다운로드</a>`
          : "";
      // 관리자가 직접 작성한 내용이 있으면 그것을 본문으로(HTML 이스케이프 + 줄바꿈), 없으면 부제.
      const bodyHtml = message
        ? message
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")
        : issue!.meta.dek;
      return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-size:22px">${issue!.meta.title}</h1>
        <div style="color:#444;font-size:15px;line-height:1.7">${bodyHtml}</div>
        <p style="margin-top:16px"><a href="${link}">웹에서 보기 →</a>${pdfLine}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
        <p style="font-size:12px;color:#999"><a href="${unsub}" style="color:#999">수신거부</a></p>
      </div>`;
    },
  });
  redirect("/admin?msg=sent");
}
