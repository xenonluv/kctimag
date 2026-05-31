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
import type { z } from "zod";

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || ""; // 비우면 사용자 기본 모델
const LLM_MODE = process.env.LLM_MODE || "claude"; // "claude" | "mock"
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

  const timeoutMs = opts.timeoutMs ?? 240_000;

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
  return invokeClaude(prompt, opts);
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
  const raw = await invokeClaude(jsonPrompt, opts);
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
