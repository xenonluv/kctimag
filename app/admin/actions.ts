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
import { sendIssueEmail, unsubscribeUrl, type Recipient } from "@/lib/mailer";
import {
  renderIssueEmail,
  resolveThemeIndex,
  escapeHtml,
  defaultEmailSubject,
} from "@/lib/email-template";
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
  const themeRaw = formData.get("themeIndex")?.toString();
  const subjectRaw = formData.get("subject")?.toString().trim();
  if (!slug) redirect("/admin?msg=noslug");
  const issue = readIssue(slug!);
  const sb = getAdminSupabase();
  if (!issue) redirect("/admin?msg=noissue");

  const site = getSiteUrl();
  let recipients: Recipient[] = [];
  if (testEmail) {
    // 테스트 주소가 실제 구독자면 그 토큰을 붙여 → 구독취소 버튼이 테스트에서도 동작
    let token: string | undefined;
    if (sb) {
      const { data } = await sb
        .from("subscribers")
        .select("unsubscribe_token")
        .eq("email", testEmail.toLowerCase())
        .maybeSingle();
      token = (data as { unsubscribe_token?: string } | null)?.unsubscribe_token;
    }
    recipients = [{ email: testEmail, unsubscribeToken: token }];
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

  const homeUrl = `${site}/`; // 메일 "웹에서 전체 보기"는 홈(AI 엄선 자랑 카드)으로
  const pdfUrl = issue!.meta.pdfUrl;
  const themeIndex = resolveThemeIndex(slug!, themeRaw); // 수동선택 우선, 없으면 주차별 자동

  await sendIssueEmail({
    recipients,
    subject: subjectRaw || defaultEmailSubject(issue!.meta.date),
    fromName: fromName || undefined,
    throttleMs: 300,
    buildHtml: (r) => {
      // PDF는 더 이상 첨부하지 않는다 — 기존 호처럼 호스팅된 pdfUrl이 있으면 다운로드 링크만 안내.
      const pdfNoteHtml = pdfUrl
        ? `전문 PDF는 <a href="${pdfUrl}">여기서 다운로드</a>하실 수 있습니다.`
        : "";
      // 관리자가 직접 작성한 내용이 있으면 그것을 본문으로(이스케이프+줄바꿈), 없으면 부제.
      const bodyHtml = escapeHtml(message || issue!.meta.dek);
      return renderIssueEmail({
        title: issue!.meta.title,
        bodyHtml,
        ctaUrl: homeUrl,
        pdfNoteHtml,
        unsubUrl: unsubscribeUrl(site, r),
        themeIndex,
      });
    },
  });
  redirect("/admin?msg=sent");
}
