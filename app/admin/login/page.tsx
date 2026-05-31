import { login } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-serif text-2xl font-bold">관리자 로그인</h1>
      <p className="mt-1 text-sm text-neutral-500">KCT 매거진 관리자 모드</p>
      <form action={login} className="mt-6 flex flex-col gap-3">
        <input
          type="password"
          name="password"
          required
          placeholder="관리자 비밀번호"
          className="rounded-md border border-neutral-300 px-4 py-2.5 outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2.5 font-medium text-white hover:opacity-90"
        >
          로그인
        </button>
        {error && (
          <p className="text-sm text-accent">비밀번호가 올바르지 않습니다.</p>
        )}
      </form>
    </main>
  );
}
