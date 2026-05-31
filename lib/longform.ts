// 장문 생성 헬퍼 — "초안 작성 → 같은 목소리로 이어쓰기 → 병합"으로 분량·깊이 확보.
// (단일 응답 길이 한계를 넘어 매거진급 분량을 만든다. 사용자 제안 기법.)
import { llmText } from "@/lib/llm";

export interface LongformOpts {
  system: string;
  /** 초안 작성 지시 프롬프트 */
  basePrompt: string;
  /** 이어쓰기에서 추가로 다룰 내용 지시 */
  continueHint: string;
  /** 총 패스 수 (기본 2 = 초안 + 이어쓰기 1회) */
  passes?: number;
  model?: string;
  /** mock 모드 fixture (LLM_MODE=mock) */
  mock?: string;
}

export async function writeLongform(opts: LongformOpts): Promise<string> {
  const passes = Math.max(1, opts.passes ?? 2);
  let full = (await llmText(
    opts.basePrompt,
    { system: opts.system, model: opts.model },
    opts.mock,
  )).trim();

  for (let i = 1; i < passes; i++) {
    const cont = (await llmText(
      `지금까지 작성된 글이다:\n\n"""\n${full}\n"""\n\n${opts.continueHint}\n` +
        `규칙:\n- 앞 내용을 반복하지 말고 자연스럽게 이어서 더 깊이 전개하라.\n` +
        `- 동일한 문체·어조·시점을 유지하라.\n` +
        `- 이어질 본문(Markdown)만 출력하라. 머리말·메타 설명·"이어서" 같은 표현 없이 바로 본문.`,
      { system: opts.system, model: opts.model },
      opts.mock ? `${opts.mock} (이어쓰기 ${i})` : undefined,
    )).trim();
    if (cont) full = `${full}\n\n${cont}`;
  }
  return full;
}
