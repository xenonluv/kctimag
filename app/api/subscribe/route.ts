import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body?.email ?? "").toString().trim().toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "유효한 이메일 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  const sb = getAdminSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "구독 시스템이 아직 설정되지 않았습니다. (Supabase 미구성)" },
      { status: 503 },
    );
  }

  const token = crypto.randomBytes(24).toString("hex");
  // upsert: 신규는 추가, 기존(수신거부 포함)은 상태를 구독중으로 복구 + 토큰 갱신 → 재구독 가능.
  const { error } = await sb
    .from("subscribers")
    .upsert(
      { email, status: "confirmed", unsubscribe_token: token },
      { onConflict: "email" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "구독이 완료되었습니다! 매주 새 호를 이메일로 보내드릴게요.",
  });
}
