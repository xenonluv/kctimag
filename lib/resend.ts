// Resend 메일러 — 구독자에게 호 발송(PDF 첨부 + 웹링크).
// 무료 한도: 100/일, 3,000/월. 50명 규모는 한도 내. 수신자 프라이버시 위해 개별 발송.
import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export function getResend(): Resend | null {
  const key = getEnv("RESEND_API_KEY");
  if (!key) return null;
  return new Resend(key);
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

export interface Recipient {
  email: string;
  unsubscribeToken?: string;
}

export async function sendIssueEmail(opts: {
  recipients: Recipient[];
  subject: string;
  /** unsubscribeToken → HTML 문자열 생성 (수신거부 링크 포함용) */
  buildHtml: (r: Recipient) => string;
  pdf?: { filename: string; content: Buffer };
  /** Resend 무료 100/일 — 대량 시 호출 간격(ms) */
  throttleMs?: number;
}): Promise<SendResult> {
  const resend = getResend();
  const from = getEnv("RESEND_FROM") || "KCT <onboarding@resend.dev>";
  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  if (!resend) {
    return { sent: 0, failed: opts.recipients.length, errors: ["RESEND_API_KEY 미설정"] };
  }

  const attachments = opts.pdf
    ? [{ filename: opts.pdf.filename, content: opts.pdf.content }]
    : undefined;

  for (const r of opts.recipients) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: r.email,
        subject: opts.subject,
        html: opts.buildHtml(r),
        attachments,
      });
      if (error) {
        result.failed++;
        result.errors.push(`${r.email}: ${error.message}`);
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
