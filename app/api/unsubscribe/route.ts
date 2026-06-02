import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

/** 다크 네이비 브랜드 카드형 확인 페이지 */
const page = (title: string, message: string, ok = false) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title} · 주간 한국문화 AI 큐레이션 뉴스모음</title></head>` +
      `<body style="margin:0;background:#0b0f18;font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#e6e9f2;display:flex;min-height:100vh;align-items:center;justify-content:center">` +
      `<div style="max-width:420px;margin:20px;padding:40px 32px;background:#141b2b;border:1px solid rgba(255,255,255,0.08);border-radius:20px;text-align:center">` +
      `<p style="margin:0 0 18px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#3b82f6">주간 한국문화 AI 큐레이션 뉴스모음</p>` +
      `<h1 style="margin:0 0 12px;font-size:22px;line-height:1.35">${ok ? "✅ " : ""}${title}</h1>` +
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#aab1c2">${message}</p>` +
      `<p style="margin:28px 0 0;font-size:13px"><a href="/" style="color:#3b82f6;text-decoration:none">홈으로 가기 →</a></p>` +
      `</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return page(
      "잘못된 요청입니다",
      "수신거부 링크가 올바르지 않습니다. 메일의 ‘구독 취소’ 버튼을 다시 눌러주세요.",
    );

  const sb = getAdminSupabase();
  if (!sb)
    return page(
      "일시적인 오류",
      "지금은 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );

  const { error } = await sb
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token);

  if (error)
    return page(
      "오류가 발생했습니다",
      "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );

  return page(
    "구독이 취소되었습니다",
    "이제부터 주간 한국문화 AI 큐레이션 뉴스모음 소식을 보내드리지 않습니다.<br/>그동안 함께해 주셔서 진심으로 감사합니다.",
    true,
  );
}
