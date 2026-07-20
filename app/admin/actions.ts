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
import { readSpecial } from "@/lib/special";
import { sendIssueEmail, unsubscribeUrl, type Recipient } from "@/lib/mailer";
import {
  renderIssueEmail,
  resolveThemeIndex,
  escapeHtml,
  defaultEmailSubject,
  issueSummaryItems,
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

// 문화기술 정책보고서 어시스턴트 사용 허용 On/Off — 끄면 다음 요청부터 즉시 차단
export async function toggleChatAllowed(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = formData.get("id")?.toString();
  const allow = formData.get("allow")?.toString() === "1";
  const sb = getAdminSupabase();
  if (sb && id) {
    const { error } = await sb
      .from("subscribers")
      .update({ chat_allowed: allow })
      .eq("id", id);
    // chat_allowed 컬럼 미생성(마이그레이션 전) 등 — 조용히 무시하지 않고 알림
    if (error) redirect("/admin?msg=chaterr");
  }
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
        summaryItems: issueSummaryItems(issue!),
        unsubUrl: unsubscribeUrl(site, r),
        themeIndex,
      });
    },
  });
  redirect("/admin?msg=sent");
}

// 특별기획 발송 — 해당 특별기획 페이지(/special/{slug})로 유도하는 메일. PDF 없음.
export async function sendSpecialEmail(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const slug = formData.get("slug")?.toString();
  const testEmail = formData.get("testEmail")?.toString().trim();
  const message = formData.get("message")?.toString().trim();
  const fromName = formData.get("fromName")?.toString().trim();
  const themeRaw = formData.get("themeIndex")?.toString();
  const subjectRaw = formData.get("subject")?.toString().trim();
  if (!slug) redirect("/admin?msg=noslug");
  const article = readSpecial(slug!);
  const sb = getAdminSupabase();
  if (!article) redirect("/admin?msg=noissue");

  const site = getSiteUrl();
  let recipients: Recipient[] = [];
  if (testEmail) {
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

  const articleUrl = `${site}/special/${slug}`; // 특별기획은 해당 기사 페이지로 유도
  const themeIndex = resolveThemeIndex(slug!, themeRaw);

  await sendIssueEmail({
    recipients,
    subject: subjectRaw || `[특별기획] ${article!.meta.title}`,
    fromName: fromName || undefined,
    throttleMs: 300,
    buildHtml: (r) => {
      const bodyHtml = escapeHtml(message || article!.meta.dek);
      return renderIssueEmail({
        title: article!.meta.title,
        bodyHtml,
        ctaUrl: articleUrl,
        ctaLabel: "특별기획 전문 읽기 →",
        unsubUrl: unsubscribeUrl(site, r),
        themeIndex,
      });
    },
  });
  redirect("/admin?msg=sent");
}
