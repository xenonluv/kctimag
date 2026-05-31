import { NextRequest, NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase";

const html = (body: string) =>
  new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
      `<body style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;text-align:center;padding:64px 20px;color:#1a1a1a">${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return html("<h1>잘못된 요청</h1><p>토큰이 없습니다.</p>");

  const sb = getAdminSupabase();
  if (!sb) return html("<h1>일시적 오류</h1><p>잠시 후 다시 시도해 주세요.</p>");

  const { error } = await sb
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token);

  if (error) return html("<h1>오류</h1><p>처리 중 문제가 발생했습니다.</p>");
  return html(
    "<h1>수신거부 완료</h1><p>더 이상 메일을 보내지 않습니다. 그동안 함께해 주셔서 감사합니다.</p>",
  );
}
