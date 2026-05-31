import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { listIssues } from "@/lib/content";
import { deleteSubscriber, resendIssue, logout } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // PDF 첨부 fetch + 다건 발송 여유

interface SubRow {
  id: string;
  email: string;
  status: string;
  created_at?: string;
}
interface LogRow {
  id: string;
  issue_slug: string;
  sent: number;
  failed: number;
  created_at?: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { msg } = await searchParams;

  const sb = getAdminSupabase();
  let subscribers: SubRow[] = [];
  let logs: LogRow[] = [];
  if (sb) {
    subscribers =
      ((await sb.from("subscribers").select("*").order("created_at", { ascending: false })).data as SubRow[]) ?? [];
    logs =
      ((await sb.from("send_logs").select("*").order("created_at", { ascending: false }).limit(10)).data as LogRow[]) ?? [];
  }
  const issues = listIssues();
  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">관리자 대시보드</h1>
        <form action={logout}>
          <button className="text-sm text-neutral-500 underline">로그아웃</button>
        </form>
      </div>

      {!isSupabaseConfigured() && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ Supabase 미구성 — 구독자/발송 기능이 비활성화되어 있습니다. (.env.local 설정 필요)
        </p>
      )}
      {msg === "sent" && (
        <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          ✅ 발송이 완료되었습니다.
        </p>
      )}

      {/* 통계 */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="text-3xl font-bold">{confirmed}</div>
          <div className="text-sm text-neutral-500">구독자 (확인됨)</div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="text-3xl font-bold">{issues.length}</div>
          <div className="text-sm text-neutral-500">발행된 호</div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4">
          <div className="text-3xl font-bold">{subscribers.length}</div>
          <div className="text-sm text-neutral-500">전체 등록</div>
        </div>
      </div>

      {/* 호별 발송 */}
      <section className="mt-10">
        <h2 className="mb-3 font-serif text-lg font-bold">호 발송 / 테스트</h2>
        <ul className="space-y-2">
          {issues.map((it) => (
            <li
              key={it.slug}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3"
            >
              <div>
                <span className="font-medium">{it.title}</span>
                <span className="ml-2 text-xs text-neutral-400">{it.slug}</span>
              </div>
              <div className="flex gap-2">
                <form action={resendIssue} className="flex gap-1">
                  <input type="hidden" name="slug" value={it.slug} />
                  <input
                    type="email"
                    name="testEmail"
                    placeholder="테스트 이메일(선택)"
                    className="w-44 rounded border border-neutral-300 px-2 py-1 text-sm"
                  />
                  <button className="rounded bg-neutral-800 px-3 py-1 text-sm text-white hover:bg-black">
                    발송
                  </button>
                </form>
              </div>
            </li>
          ))}
          {issues.length === 0 && (
            <li className="text-sm text-neutral-500">발행된 호가 없습니다.</li>
          )}
        </ul>
        <p className="mt-2 text-xs text-neutral-400">
          테스트 이메일을 비우면 전체 확인 구독자에게 발송됩니다. (주간 자동 발송은
          파이프라인이 PDF 첨부로 수행)
        </p>
      </section>

      {/* 구독자 목록 */}
      <section className="mt-10">
        <h2 className="mb-3 font-serif text-lg font-bold">구독자</h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{s.email}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        s.status === "confirmed"
                          ? "text-green-600"
                          : s.status === "unsubscribed"
                            ? "text-neutral-400"
                            : "text-amber-600"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteSubscriber}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="text-xs text-accent underline">삭제</button>
                    </form>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-neutral-500">
                    구독자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 발송 로그 */}
      {logs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-serif text-lg font-bold">최근 발송 로그</h2>
          <ul className="space-y-1 text-sm text-neutral-600">
            {logs.map((l) => (
              <li key={l.id}>
                {l.issue_slug} — 성공 {l.sent} / 실패 {l.failed}{" "}
                <span className="text-neutral-400">
                  {l.created_at?.slice(0, 16).replace("T", " ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
