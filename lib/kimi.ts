// Kimi K3 (Moonshot, OpenAI 호환) 클라이언트 — 문화기술 정책보고서 어시스턴트 전용.
// 발행 파이프라인(lib/llm.ts)과 완전히 독립: 여기는 항상 kimi-k3 고정.
const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.ai/v1";
const K3_MODEL = process.env.KIMI_K3_MODEL || "kimi-k3";

export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface K3Options {
  maxTokens?: number;
  /** K3는 thinking 항상 켜짐 — low가 대화형 UI에 가장 빠름 */
  reasoningEffort?: "low" | "high" | "max";
  json?: boolean;
  signal?: AbortSignal;
}

function requireKey(): string {
  const key = process.env.KIMI_API_KEY;
  if (!key) throw new Error("KIMI_API_KEY 미설정");
  return key;
}

function buildBody(messages: KimiMessage[], opts: K3Options, stream: boolean) {
  const body: Record<string, unknown> = {
    model: K3_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 4000,
    reasoning_effort: opts.reasoningEffort ?? "low",
    stream,
  };
  if (opts.json) body.response_format = { type: "json_object" };
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
