"use client";
import { useState } from "react";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "구독 신청에 실패했습니다.");
      setStatus("ok");
      setMsg(data.message || "구독 신청이 접수되었습니다. 확인 메일을 확인해 주세요.");
      setEmail("");
    } catch (err) {
      setStatus("err");
      setMsg((err as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일 주소"
        className="flex-1 rounded-md border border-neutral-300 px-4 py-2.5 outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-md bg-accent px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "처리 중…" : "무료 구독"}
      </button>
      {msg && (
        <p
          className={`mt-1 text-sm sm:mt-0 sm:self-center ${
            status === "ok" ? "text-green-600" : "text-accent"
          }`}
        >
          {msg}
        </p>
      )}
    </form>
  );
}
