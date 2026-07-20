"use client";
// 문화기술 정책보고서 어시스턴트 — Kimi K3 채팅 UI.
// 이메일 게이트(관리자 승인 구독자만) → NDJSON 스트리밍 대화 → MD 저장/인쇄(PDF).
import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";

const EMAIL_KEY = "kct_assistant_email";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "최근 일주일 한국 문화기술 동향 보고서를 A4 5장 분량으로 작성해줘",
  "이번 주 K-콘텐츠 분야에서 가장 중요한 뉴스 3가지를 요약해줘",
  "최근 웹툰 산업 동향과 정책적 시사점을 알려줘",
];

export default function AssistantChat() {
  const [gate, setGate] = useState<"loading" | "locked" | "open">("loading");
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [gateError, setGateError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<{ label: string; eta?: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  // nonce를 함께 저장 — 같은 메시지를 다시 인쇄해도 effect가 재실행되도록
  const [printReq, setPrintReq] = useState<{ idx: number; n: number } | null>(
    null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 저장된 이메일로 자동 입장 시도
  useEffect(() => {
    const saved = window.localStorage.getItem(EMAIL_KEY);
    if (saved) {
      setEmailInput(saved);
      void verify(saved);
    } else {
      setGate("locked");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자동 스크롤 — 사용자가 위로 올려 읽는 중이면 끌어내리지 않음
  useEffect(() => {
    const el = document.scrollingElement;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 240;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, stage]);

  // 인쇄 대상이 설정되면 인쇄 대화상자 열기
  useEffect(() => {
    if (printReq === null) return;
    const t = setTimeout(() => window.print(), 100);
    const reset = () => setPrintReq(null);
    window.addEventListener("afterprint", reset);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", reset);
    };
  }, [printReq]);

  async function verify(target: string) {
    setGate("loading");
    setGateError("");
    try {
      const res = await fetch(
        `/api/assistant?email=${encodeURIComponent(target)}`,
      );
      const data = await res.json();
      if (res.ok && data.allowed) {
        setEmail(target);
        setRemaining(data.remaining ?? null);
        window.localStorage.setItem(EMAIL_KEY, target);
        setGate("open");
      } else {
        setGateError(data.reason || "사용이 승인되지 않은 이메일입니다.");
        setGate("locked");
      }
    } catch {
      setGateError("확인 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setGate("locked");
    }
  }

  function leave() {
    abortRef.current?.abort(); // 진행 중 스트림 먼저 중단 (빈 목록에 델타가 쌓이는 것 방지)
    window.localStorage.removeItem(EMAIL_KEY);
    setEmail("");
    setMessages([]);
    setGate("locked");
  }

  /** base: 재시도 시 잘라낸 이력을 명시적으로 전달 (state 클로저 스냅샷 문제 회피) */
  async function send(text: string, base?: Msg[]) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError("");
    const history: Msg[] = [
      ...(base ?? messages),
      { role: "user", content: trimmed },
    ];
    setMessages(history);
    setBusy(true);
    setStage(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantStarted = false;

    const appendDelta = (delta: string) => {
      if (!assistantStarted) {
        assistantStarted = true;
        setMessages((prev) => [...prev, { role: "assistant", content: delta }]);
      } else {
        setMessages((prev) => {
          // "나가기" 등으로 목록이 바뀌었으면 조용히 무시
          if (
            prev.length === 0 ||
            prev[prev.length - 1].role !== "assistant"
          ) {
            return prev;
          }
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + delta,
          };
          return next;
        });
      }
    };

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, messages: history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "요청을 처리하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      if (!res.body) {
        setError("응답을 받지 못했어요. 다시 시도해 주세요.");
        return;
      }
      // 서버는 생성 시작 시점에 사용량을 기록하므로 여기서 차감 (중지/오류여도 1회 소진)
      setRemaining((r) => (r === null ? r : Math.max(0, r - 1)));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: {
            type: string;
            label?: string;
            eta?: string;
            text?: string;
            message?: string;
          };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === "stage" && ev.label) {
            setStage({ label: ev.label, eta: ev.eta });
          } else if (ev.type === "delta" && ev.text) {
            // stage는 유지 — 보고서 섹션 작성 중에도 단계 라벨이 계속 보이도록
            appendDelta(ev.text);
          } else if (ev.type === "error") {
            setError(
              ev.message || "생성 중 오류가 발생했어요. 다시 시도해 주세요.",
            );
          }
        }
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        // 첫 델타 전에 중지해도 피드백이 남도록 (appendDelta가 새 말풍선 생성)
        appendDelta(
          assistantStarted
            ? "\n\n_(생성이 중지되었습니다)_"
            : "_(생성이 중지되었습니다)_",
        );
      } else {
        setError("연결이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.");
      }
    } finally {
      setBusy(false);
      setStage(null);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function retry() {
    // 마지막 user 메시지를 다시 전송 (실패한 assistant 부분 응답은 제거).
    // 잘라낸 이력을 send에 직접 넘긴다 — setMessages 후 바로 send하면 이전
    // 스냅샷의 messages가 쓰여 메시지가 중복되기 때문.
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx < 0) return;
    const text = messages[lastUserIdx].content;
    void send(text, messages.slice(0, lastUserIdx));
  }

  function downloadMd(content: string) {
    const firstLine = content.split("\n")[0].replace(/^#+\s*/, "").trim();
    const name = (firstLine || "어시스턴트-답변")
      .replace(/[\\/:*?"<>|]/g, "-")
      .slice(0, 40);
    // KST 기준 날짜
    const date = new Date(Date.now() + 9 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${date}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // 즉시 해제 시 일부 브라우저에서 다운로드 실패
  }

  // ── 이메일 게이트 화면 ──
  if (gate !== "open") {
    return (
      <main className="mx-auto max-w-xl px-5 py-16">
        <h1 className="on-navy font-serif text-2xl font-bold">
          문화기술 정책보고서 어시스턴트
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          최근 7일간 수집된 한국 문화 뉴스를 근거로, 대화하면서 문화기술 동향·정책
          보고서를 만들어 드립니다. 관리자가 사용을 승인한 구독자만 이용할 수
          있어요.
        </p>
        <form
          className="mt-8 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = emailInput.trim().toLowerCase();
            if (v) void verify(v);
          }}
        >
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="구독 이메일 주소"
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-accent focus:outline-none"
          />
          <button
            disabled={gate === "loading"}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {gate === "loading" ? "확인 중..." : "입장하기"}
          </button>
        </form>
        {gateError && (
          <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
            {gateError}
          </p>
        )}
        <p className="mt-6 text-xs text-neutral-500">
          사용 승인이 필요하시면 뉴스레터 관리자에게 문의해 주세요.
        </p>
      </main>
    );
  }

  // ── 채팅 화면 ──
  return (
    <>
      <main className="no-print mx-auto flex max-w-3xl flex-col px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="on-navy font-serif text-xl font-bold">
              문화기술 정책보고서 어시스턴트
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              최근 7일 뉴스 근거 · 보고서 요청 시 완성까지 약 3~5분
            </p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>
              {email} ·{" "}
              <button onClick={leave} className="underline hover:text-accent">
                나가기
              </button>
            </div>
            {remaining !== null && <div>오늘 {remaining}회 남음</div>}
          </div>
        </div>

        <div className="mt-6 min-h-[40vh] space-y-4">
          {messages.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-neutral-300">
                무엇이든 물어보세요. 예를 들면:
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => void send(ex)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-neutral-300 hover:border-accent/60 hover:text-white"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent/90 px-4 py-2.5 text-sm text-white">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start">
                <div className="kct-chat w-full max-w-[95%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                  <Markdown>{m.content}</Markdown>
                </div>
                {!(busy && i === messages.length - 1) && (
                  <div className="mt-1.5 flex gap-3 pl-1 text-xs text-neutral-500">
                    <button
                      onClick={() => downloadMd(m.content)}
                      className="underline hover:text-accent"
                    >
                      MD 저장
                    </button>
                    <button
                      onClick={() => setPrintReq({ idx: i, n: Date.now() })}
                      className="underline hover:text-accent"
                    >
                      인쇄 / PDF 저장
                    </button>
                  </div>
                )}
              </div>
            ),
          )}

          {/* 진행 인디케이터 */}
          {busy && (
            <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-neutral-200">
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <div>
                <div>{stage?.label ?? "답변을 작성하고 있어요..."}</div>
                {stage?.eta && (
                  <div className="mt-0.5 text-xs text-neutral-400">
                    {stage.eta}
                  </div>
                )}
              </div>
              <button
                onClick={stop}
                className="ml-auto shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-neutral-300 hover:border-red-400/60 hover:text-red-300"
              >
                중지
              </button>
            </div>
          )}

          {error && !busy && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
              <button
                onClick={retry}
                className="ml-3 rounded border border-red-300/40 px-2 py-0.5 text-xs underline hover:bg-red-400/10"
              >
                다시 시도
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="sticky bottom-4 mt-6 flex items-end gap-2 rounded-xl border border-white/15 bg-[#0b0f18]/95 p-2 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && input.trim()) {
              void send(input);
              setInput("");
            }
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // keyCode 229: Safari 한글 IME 조합 확정 Enter 오발송 방지
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                if (!busy && input.trim()) {
                  void send(input);
                  setInput("");
                }
              }
            }}
            rows={2}
            placeholder='질문하거나 "…보고서를 작성해줘"라고 요청해 보세요 (Enter 전송, Shift+Enter 줄바꿈)'
            className="max-h-40 flex-1 resize-y rounded-lg bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
          <button
            disabled={busy || !input.trim()}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            전송
          </button>
        </form>
      </main>

      {/* 인쇄 전용 영역 — 화면에는 숨김, 인쇄 시 이 내용만 출력 */}
      {printReq !== null && messages[printReq.idx] && (
        <div className="kct-print hidden bg-white p-8 text-black print:block">
          <Markdown>{messages[printReq.idx].content}</Markdown>
        </div>
      )}
    </>
  );
}
