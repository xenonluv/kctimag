// 메일러 — 프로바이더 추상화. MAIL_PROVIDER=brevo(기본) | resend.
//
// Brevo: 단일 발신자 인증(도메인 불필요) + HTTP API(`https://api.brevo.com/v3/smtp/email`).
//   → SMTP 차단 환경에서도 동작(HTTPS). 무료 300통/일, PDF 첨부(base64) 지원.
// Resend: 도메인 인증 보유 시 전환용(기존 lib/resend.ts 재사용).
//
// `sendIssueEmail` 시그니처는 lib/resend.ts와 동일 → 호출부(08-publish-send, admin) 변경 최소.
import { getEnv } from "@/lib/env";
import {
  sendIssueEmail as sendViaResend,
  type SendResult,
  type Recipient,
} from "@/lib/resend";

export type { SendResult, Recipient };

export interface SendOpts {
  recipients: Recipient[];
  subject: string;
  buildHtml: (r: Recipient) => string;
  pdf?: { filename: string; content: Buffer };
  throttleMs?: number;
  /** 보낸사람 이름 오버라이드(이메일 주소는 인증된 발신자 유지). 비우면 MAIL_FROM 기본값. */
  fromName?: string;
}

/** "KCT <a@b.com>" 또는 "a@b.com" → {name, email} */
function parseFrom(): { name: string; email: string } {
  const raw =
    getEnv("MAIL_FROM") || getEnv("RESEND_FROM") || "KCT <onboarding@resend.dev>";
  const m = raw.match(/^\s*"?(.*?)"?\s*<(.+)>\s*$/);
  if (m) return { name: m[1] || "KCT", email: m[2].trim() };
  return { name: "KCT", email: raw.trim() };
}

async function sendViaBrevo(opts: SendOpts): Promise<SendResult> {
  const key = getEnv("BREVO_API_KEY");
  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  if (!key) {
    return { sent: 0, failed: opts.recipients.length, errors: ["BREVO_API_KEY 미설정"] };
  }
  const sender = parseFrom();
  if (opts.fromName) sender.name = opts.fromName; // 발신자 이름만 오버라이드(주소는 인증 발신자 유지)
  const attachment = opts.pdf
    ? [{ name: opts.pdf.filename, content: opts.pdf.content.toString("base64") }]
    : undefined;

  for (const r of opts.recipients) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": key,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: r.email }],
          subject: opts.subject,
          htmlContent: opts.buildHtml(r),
          attachment,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        result.failed++;
        result.errors.push(`${r.email}: ${res.status} ${body.slice(0, 200)}`);
      } else {
        result.sent++;
      }
    } catch (e) {
      result.failed++;
      result.errors.push(`${r.email}: ${(e as Error).message}`);
    }
    if (opts.throttleMs) await new Promise((res) => setTimeout(res, opts.throttleMs));
  }
  return result;
}

export async function sendIssueEmail(opts: SendOpts): Promise<SendResult> {
  const provider = (getEnv("MAIL_PROVIDER") || "brevo").toLowerCase();
  if (provider === "resend") return sendViaResend(opts);
  return sendViaBrevo(opts);
}

/** 수신거부 URL — 토큰 있으면 /api/unsubscribe, 없으면 사이트 홈 */
export function unsubscribeUrl(site: string, r: Recipient): string {
  return r.unsubscribeToken
    ? `${site}/api/unsubscribe?token=${r.unsubscribeToken}`
    : site;
}

/** 모든 발송 메일 하단에 항상 들어가는 구독취소 안내문 + 버튼(HR 포함).
 *  관리자 발송·구독자 자동발송 양쪽에서 공용 사용. */
export function unsubscribeBlockHtml(unsubUrl: string): string {
  return `<hr style="border:none;border-top:1px solid #e5e5e5;margin:26px 0"/>
  <div style="text-align:center;padding:4px 0 8px">
    <p style="font-size:13px;color:#888;line-height:1.7;margin:0 0 14px">
      주간 한국문화 AI 매거진 소식을 더 이상 받지 않으시려면<br/>아래 버튼을 눌러주세요.
    </p>
    <a href="${unsubUrl}" style="display:inline-block;background:#f0f0f0;color:#555;text-decoration:none;padding:11px 24px;border-radius:6px;font-size:13px;font-weight:600;border:1px solid #ddd">구독 취소</a>
  </div>`;
}
