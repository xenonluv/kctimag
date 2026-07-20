// Kimi K3 (Moonshot, OpenAI 호환) 클라이언트 — 문화기술 정책보고서 어시스턴트 전용.
// 발행 파이프라인(lib/llm.ts)과 완전히 독립: 여기는 항상 kimi-k3 고정.
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1";
const K3_MODEL = process.env.KIMI_K3_MODEL || "kimi-k3";

export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KimiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** 도구 호출 루프용 확장 메시지 (assistant의 tool_calls, tool 응답 포함) */
export type KimiChatMessage =
  | KimiMessage
  | { role: "assistant"; content: string; tool_calls: KimiToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

interface K3Options {
  maxTokens?: number;
  /** K3는 thinking 항상 켜짐 — low가 대화형 UI에 가장 빠름 */
  reasoningEffort?: "low" | "high" | "max";
  json?: boolean;
  signal?: AbortSignal;
  /** OpenAI 호환 tools 배열 (커스텀 함수 도구 — 실행은 호출자가 담당)
   *  참고: Moonshot 내장 $web_search는 kimi-k3에서 현재 서버 오류(tokenization failed)로 미사용. */
  tools?: unknown[];
}

function requireKey(): string {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new Error("KIMI_API_KEY 미설정");
  return key;
}

function buildBody(
  messages: KimiChatMessage[],
  opts: K3Options,
  stream: boolean,
) {
  const body: Record<string, unknown> = {
    model: K3_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 4000,
    reasoning_effort: opts.reasoningEffort ?? "low",
    stream,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  if (opts.tools && opts.tools.length > 0) body.tools = opts.tools;
  return body;
}

/** 단발 호출 (보고서 목차 생성 등) → 본문 텍스트 반환 */
export async function kimiK3Complete(
  messages: KimiMessage[],
  opts: K3Options = {},
): Promise<string> {
  const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(messages, opts, false)),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`Kimi K3 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Kimi K3 빈 응답");
  return text;
}

export type KimiStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: KimiToolCall[] };

/** 스트리밍 호출 → 본문 델타 + (있다면) 조립된 tool_calls를 yield. reasoning_content는 건너뜀. */
export async function* kimiK3StreamEvents(
  messages: KimiChatMessage[],
  opts: K3Options = {},
): AsyncGenerator<KimiStreamEvent> {
  const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(messages, opts, true)),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`Kimi K3 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  if (!res.body) {
    throw new Error("Kimi K3: 스트림 본문 없음");
  }

  // tool_calls는 델타 조각으로 나뉘어 오므로 index별로 조립
  const pending = new Map<number, KimiToolCall>();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          if (pending.size > 0) {
            yield { type: "tool_calls", calls: [...pending.values()] };
          }
          return;
        }
        let parsed: {
          choices?: {
            delta?: {
              content?: string | null;
              tool_calls?: {
                index?: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }[];
            };
          }[];
        };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) yield { type: "text", text: delta.content };
        for (const tc of delta?.tool_calls ?? []) {
          const idx = tc.index ?? 0;
          const cur =
            pending.get(idx) ??
            ({ id: "", type: "function", function: { name: "", arguments: "" } } as KimiToolCall);
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.function.name = tc.function.name;
          if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
          pending.set(idx, cur);
        }
      }
    }
    if (pending.size > 0) {
      yield { type: "tool_calls", calls: [...pending.values()] };
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** 스트리밍 호출 → 본문(content) 델타를 순서대로 yield. reasoning_content는 건너뜀. */
export async function* kimiK3Stream(
  messages: KimiMessage[],
  opts: K3Options = {},
): AsyncGenerator<string> {
  const res = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(messages, opts, true)),
    signal: opts.signal,
  });
  if (!res.ok) {
    throw new Error(`Kimi K3 ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  if (!res.body) {
    throw new Error("Kimi K3: 스트림 본문 없음");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE: "data: {...}\n\n" 단위. 마지막 조각은 다음 청크와 이어붙인다.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        let parsed: {
          choices?: { delta?: { content?: string | null } }[];
        };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue; // 불완전 조각 — 무시 (다음 청크에서 재조립 불가한 건 드묾)
        }
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  } finally {
    // 조기 종료(중지·에러) 시 업스트림 연결을 실제로 닫아 토큰 낭비 방지
    await reader.cancel().catch(() => {});
  }
}
