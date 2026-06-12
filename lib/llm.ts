// 런타임 LLM 래퍼 — Claude CLI(`claude -p` 헤드리스)를 호출한다.
// Mac Studio의 로그인된 구독 세션을 사용 → 추가비용 0.
//
// ⚠️ 인증 주의: `claude -p` 가 구독으로 동작하려면 실행 머신에서 `claude` 가
//   로그인되어 있어야 한다(ANTHROPIC_API_KEY 미설정 권장). Mac Studio에서
//   `echo hi | claude -p` 가 정상 응답하는지 먼저 확인할 것.
//
// 출력 형식(확인됨): `--output-format json` →
//   {"type":"result","is_error":bool,"result":"<텍스트>", ...}
//
// LLM_MODE=mock 이면 각 호출에 주입된 fixture를 반환(파이프라인 배관 테스트/드라이런용).

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { readFileSync, rmSync } from "node:fs";
import type { z } from "zod";

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || ""; // 비우면 사용자 기본 모델
const LLM_MODE = process.env.LLM_MODE || "claude"; // "claude" | "mock"
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "claude").toLowerCase(); // "claude" | "codex" | "gemini" | "groq"
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash"; // thinking 없음 → JSON 안정
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const CODEX_BIN = process.env.CODEX_BIN || "codex";
const CODEX_MODEL = process.env.CODEX_MODEL || ""; // 비우면 사용자 기본 모델(구독)
const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 240_000);
const EXTRA_ARGS = (process.env.CLAUDE_EXTRA_ARGS || "")
  .split(" ")
  .map((s) => s.trim())
  .filter(Boolean);

export interface LlmOptions {
  /** 역할 시스템 프롬프트 (전체 교체) */
  system?: string;
  /** 모델 오버라이드 (예: "sonnet") */
  model?: string;
  /** 타임아웃 ms (기본 240초) */
  timeoutMs?: number;
  /** JSON 응답 모드 (Gemini responseMimeType=application/json) */
  json?: boolean;
}

interface ClaudeEnvelope {
  type: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
}

/** 저수준: claude -p 호출 → result 텍스트 반환 */
function invokeClaude(prompt: string, opts: LlmOptions = {}): Promise<string> {
  const args = ["-p", "--output-format", "json"];
  const model = opts.model || CLAUDE_MODEL;
  if (model) args.push("--model", model);
  if (opts.system) args.push("--system-prompt", opts.system);
  args.push(...EXTRA_ARGS);

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<string>((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude -p 타임아웃 (${timeoutMs}ms)`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`claude 실행 실패: ${err.message} (CLAUDE_BIN=${CLAUDE_BIN})`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        return reject(
          new Error(`claude 빈 출력 (code ${code}). stderr: ${stderr.slice(0, 300)}`),
        );
      }
      try {
        const env = JSON.parse(stdout) as ClaudeEnvelope;
        if (env.is_error) {
          return reject(new Error(`claude 오류 응답: ${env.result}`));
        }
        resolve(env.result ?? "");
      } catch {
        reject(new Error(`claude 출력 파싱 실패: ${stdout.slice(0, 300)}`));
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** 저수준: Gemini generateContent → 텍스트 반환 (HTTP API, claude -p 막힌 환경/대안용) */
async function invokeGemini(prompt: string, opts: LlmOptions = {}): Promise<string> {
  const key = process.env.GOOGLE_GENAI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENAI_API_KEY 미설정 (Gemini 백엔드)");
  const model = opts.model || GEMINI_TEXT_MODEL;
  const genConfig: Record<string, unknown> = {
    temperature: 0.6,
    maxOutputTokens: 8192,
  };
  if (opts.json) genConfig.responseMimeType = "application/json";
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: genConfig,
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "X-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("") ?? "";
  if (!text) throw new Error("Gemini 빈 응답");
  return text;
}

/** 저수준: Groq(OpenAI 호환) → 텍스트 반환 (무료 백엔드) */
async function invokeGroq(prompt: string, opts: LlmOptions = {}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY 미설정 (Groq 백엔드)");
  const model = opts.model || GROQ_MODEL;
  const messages: { role: string; content: string }[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.6,
    max_tokens: 8000,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq 빈 응답");
  return text;
}

/** 저수준: codex exec 헤드리스 호출 → 최종 답 텍스트 반환 (OpenAI/ChatGPT 구독 인증, 추가비용 0)
 *  claude -p 가 401로 막힌 환경에서도 codex 는 독립 인증(~/.codex/auth.json)이라 동작한다.
 *  최종 답은 -o 파일로 받아 stdout 의 에이전트 진행 로그와 분리한다. */
async function invokeCodex(prompt: string, opts: LlmOptions = {}): Promise<string> {
  const outFile = path.join(os.tmpdir(), `codex-out-${process.pid}-${Date.now()}.txt`);
  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "-s",
    "read-only",
    "-o",
    outFile,
  ];
  const model = opts.model || CODEX_MODEL;
  if (model) args.push("-m", model);
  args.push("-"); // 프롬프트는 stdin (긴 큐레이션 프롬프트의 인자 길이 제한 회피)

  const fullPrompt = opts.system ? `${opts.system}\n\n${prompt}` : prompt;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<string>((resolve, reject) => {
    const child = spawn(CODEX_BIN, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`codex 타임아웃 (${timeoutMs}ms)`));
    }, timeoutMs);
    child.stdout.on("data", () => {}); // 에이전트 진행 로그는 버림(최종 답은 -o 파일)
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`codex 실행 실패: ${err.message} (CODEX_BIN=${CODEX_BIN})`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let text = "";
      try {
        text = readFileSync(outFile, "utf8").trim();
      } catch {
        /* 파일 없음 → 빈 출력으로 처리 */
      }
      try {
        rmSync(outFile, { force: true });
      } catch {
        /* 정리 실패 무시 */
      }
      if (!text) {
        return reject(
          new Error(`codex 빈 출력 (code ${code}). stderr: ${stderr.slice(0, 300)}`),
        );
      }
      resolve(text);
    });

    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}

function invokeLLM(prompt: string, opts: LlmOptions): Promise<string> {
  if (LLM_PROVIDER === "codex") return invokeCodex(prompt, opts);
  if (LLM_PROVIDER === "gemini") return invokeGemini(prompt, opts);
  if (LLM_PROVIDER === "groq") return invokeGroq(prompt, opts);
  return invokeClaude(prompt, opts);
}

/** LLM 텍스트 생성 */
export async function llmText(
  prompt: string,
  opts: LlmOptions = {},
  mock?: string,
): Promise<string> {
  if (LLM_MODE === "mock") {
    if (mock !== undefined) return mock;
    throw new Error("LLM_MODE=mock 이지만 mock fixture가 없습니다.");
  }
  return invokeLLM(prompt, opts);
}

/** LLM JSON 생성 + zod 검증 */
export async function llmJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  opts: LlmOptions = {},
  mock?: T,
): Promise<T> {
  if (LLM_MODE === "mock") {
    if (mock !== undefined) return schema.parse(mock);
    throw new Error("LLM_MODE=mock 이지만 mock fixture가 없습니다.");
  }
  const jsonPrompt =
    prompt +
    "\n\n[출력 형식] 반드시 유효한 JSON만 출력하라. 마크다운 코드펜스(```)나 설명 문구 없이 JSON 하나만 출력한다.";
  const raw = await invokeLLM(jsonPrompt, { ...opts, json: true });
  const parsed = extractJson(raw);
  return schema.parse(parsed);
}

/** LLM 출력 텍스트에서 JSON 부분만 안전하게 추출 */
export function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  let start: number;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) throw new Error(`LLM 출력에 JSON 없음: ${t.slice(0, 200)}`);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end === -1 || end < start) throw new Error("JSON 종료 토큰 없음");
  return JSON.parse(t.slice(start, end + 1));
}

export const isMockMode = LLM_MODE === "mock";
