// 이메일 템플릿 — 파스텔 카드 디자인 + 7색 "주차별 순환".
// 관리자 발송(app/admin/actions.ts)과 자동 발송(scripts/pipeline/08-publish-send.ts)이 공용으로 사용.
// 이미지 없이 색·라운드 카드만 사용 → 모든 메일앱 호환.

const BRAND = "주간 한국문화 AI 큐레이션 뉴스모음";
const KICKER = `✨ KCTI · ${BRAND}`;

export interface EmailTheme {
  key: string;
  /** 관리자 드롭다운 표시용 한글 이름 */
  name: string;
  pageBg: string;
  accent: string;
  divider: string;
  unsubBg: string;
  unsubText: string;
  unsubBorder: string;
  /** box-shadow 색(rgba) */
  shadow: string;
}

/** 주차별로 순환하는 7색 파스텔 테마 (1라벤더 → … → 7앰버 → 다시 1) */
export const EMAIL_THEMES: EmailTheme[] = [
  { key: "lavender", name: "라벤더", pageBg: "#f1ebff", accent: "#7c6bff", divider: "#ece6fa", unsubBg: "#f3eeff", unsubText: "#7268a0", unsubBorder: "#e4dcfa", shadow: "rgba(110,80,200,.16)" },
  { key: "rose", name: "로즈", pageBg: "#ffe9f2", accent: "#ec4899", divider: "#fbe3ee", unsubBg: "#fff0f6", unsubText: "#b03a6e", unsubBorder: "#fcdce8", shadow: "rgba(200,40,110,.15)" },
  { key: "mint", name: "민트", pageBg: "#e4f7f4", accent: "#14b8a6", divider: "#ddf2ef", unsubBg: "#eefbf9", unsubText: "#2f8579", unsubBorder: "#cdeee9", shadow: "rgba(20,150,130,.15)" },
  { key: "sky", name: "스카이블루", pageBg: "#e9f1ff", accent: "#3b82f6", divider: "#e2ecfb", unsubBg: "#f0f5ff", unsubText: "#3c64b0", unsubBorder: "#d8e4fb", shadow: "rgba(40,90,200,.15)" },
  { key: "coral", name: "코랄", pageBg: "#fff0ea", accent: "#f4663f", divider: "#fbe6df", unsubBg: "#fff5f1", unsubText: "#c2543b", unsubBorder: "#fbddd2", shadow: "rgba(220,90,50,.15)" },
  { key: "green", name: "그린", pageBg: "#e8f7ee", accent: "#1aa86a", divider: "#ddf2e6", unsubBg: "#f0fbf4", unsubText: "#2f8757", unsubBorder: "#d2eede", shadow: "rgba(30,160,90,.15)" },
  { key: "amber", name: "앰버", pageBg: "#fdf4df", accent: "#cf971f", divider: "#f5ecd4", unsubBg: "#fef9ec", unsubText: "#a47d28", unsubBorder: "#f3e3bd", shadow: "rgba(200,150,40,.18)" },
];

const wrap = (i: number) => {
  const n = EMAIL_THEMES.length;
  return ((i % n) + n) % n;
};

/** 메일 제목 기본값 — "KCTI - AI 큐레이터 발행 주간 문화 뉴스 모음 (발행날짜)" */
export function defaultEmailSubject(date: string): string {
  return `KCTI - AI 큐레이터 발행 주간 문화 뉴스 모음 (${date})`;
}

/** 일반 텍스트 → HTML 안전 문자열(+줄바꿈 <br>) */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

/** 발행 슬러그(YYYY-MM-DD)에서 주차 기준 테마 인덱스(0~6) 자동 결정.
 *  연속한 주(7일 간격) 발행이면 인덱스가 1씩 전진 → 매주 다른 색. 상태 저장 불필요. */
export function pickThemeIndexBySlug(slug: string): number {
  const t = Date.parse(`${slug}T00:00:00Z`);
  if (Number.isNaN(t)) return 0;
  const weeks = Math.floor(t / (7 * 24 * 60 * 60 * 1000));
  return wrap(weeks);
}

/** 관리자 수동선택 우선, 유효하지 않으면 슬러그 기준 자동 순회 */
export function resolveThemeIndex(
  slug: string,
  manual?: number | string | null,
): number {
  if (manual !== undefined && manual !== null && `${manual}`.trim() !== "") {
    const i = Number(manual);
    if (Number.isInteger(i) && i >= 0 && i < EMAIL_THEMES.length) return i;
  }
  return pickThemeIndexBySlug(slug);
}

export interface RenderEmailOpts {
  title: string;
  /** 이미 안전 처리된 본문 HTML(escapeHtml 적용본 또는 신뢰 HTML) */
  bodyHtml: string;
  ctaUrl: string;
  ctaLabel?: string;
  /** CTA 아래 PDF 안내(HTML). 없으면 생략 */
  pdfNoteHtml?: string;
  unsubUrl: string;
  /** 0~6 (범위를 벗어나면 자동 순환 처리) */
  themeIndex: number;
}

/** 파스텔 카드 이메일(전체 HTML 문서) 렌더 */
export function renderIssueEmail(opts: RenderEmailOpts): string {
  const th = EMAIL_THEMES[wrap(opts.themeIndex)];
  const cta = opts.ctaLabel || "웹에서 전체 보기 →";
  const pdf = opts.pdfNoteHtml
    ? `<p style="margin:22px 0 0;font-size:14px;color:#6f687c">${opts.pdfNoteHtml}</p>`
    : "";
  return `<!doctype html><html lang="ko"><body style="margin:0;background:${th.pageBg};font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;color:#1a1a1a">
  <div style="background:${th.pageBg};padding:30px 18px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 8px 26px ${th.shadow}">
      <div style="padding:30px 28px">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;color:${th.accent};font-weight:700">${KICKER}</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#2a2530">${opts.title}</h1>
        <div style="margin:0 0 22px;font-size:15px;line-height:1.75;color:#5d5668">${opts.bodyHtml}</div>
        <a href="${opts.ctaUrl}" style="display:inline-block;background:${th.accent};color:#fff;text-decoration:none;padding:12px 26px;border-radius:30px;font-weight:700;font-size:15px">${cta}</a>
        ${pdf}
        <hr style="border:none;border-top:1px solid ${th.divider};margin:26px 0"/>
        <div style="text-align:center">
          <p style="font-size:13px;color:#9a93a8;line-height:1.7;margin:0 0 14px">${BRAND} 소식을 더 이상 받지 않으시려면<br/>아래 버튼을 눌러주세요.</p>
          <a href="${opts.unsubUrl}" style="display:inline-block;background:${th.unsubBg};color:${th.unsubText};text-decoration:none;padding:11px 24px;border-radius:30px;font-size:13px;font-weight:600;border:1px solid ${th.unsubBorder}">구독 취소</a>
        </div>
      </div>
    </div>
  </div></body></html>`;
}
