// 디자인 샘플 생성기 — 실제 발행 호(issue.json)를 3가지 디자인으로 렌더해 .design-samples/ 에 출력.
// 사용: node scripts/design-samples.mjs [slug]
import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2] || "2026-05-31";
const issue = JSON.parse(
  fs.readFileSync(`content/issues/${slug}/issue.json`, "utf8"),
);
const { meta, editorPick, editorial, categories } = issue;
const C = meta.curation || { scanned: 0, selected: 0, breakdown: [] };

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const U = (u) => esc(u || "");

const FONTS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&family=Nanum+Myeongjo:wght@400;700;800&display=swap" rel="stylesheet">`;

function sections(cardFn, secWrap) {
  return categories
    .map((c) => secWrap(c.label, c.entries.length, c.entries.map((e) => cardFn(e, c.label)).join("")))
    .join("\n");
}

/* ───────────────── THEME A · 정통 매거진 ───────────────── */
const cssA = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f6f3ec;color:#15130f;font-family:'Nanum Gothic',sans-serif;line-height:1.75;-webkit-font-smoothing:antialiased}
.wrap{max-width:880px;margin:0 auto;padding:0 24px}
.masthead{text-align:center;border-bottom:3px double #15130f;padding:44px 0 18px;margin-bottom:30px}
.masthead .kicker{font-size:11px;letter-spacing:.4em;text-transform:uppercase;color:#6b6256}
.masthead h1{font-family:'Nanum Myeongjo',serif;font-size:46px;font-weight:800;letter-spacing:-.02em;margin-top:12px;line-height:1.12}
.masthead .dek{font-family:'Nanum Myeongjo',serif;font-style:italic;color:#6b6256;margin-top:14px;font-size:17px}
.curation{border:1px solid #d9d1c2;border-left:3px solid #8a1c1c;padding:16px 22px;margin:26px 0;background:#fffdf8}
.curation .lead{font-size:14.5px}.curation b{color:#8a1c1c}
.curation .chips{margin-top:10px;font-size:12px;color:#6b6256;display:flex;flex-wrap:wrap;gap:6px 16px}
.pick{margin:40px 0;border-top:1px solid #d9d1c2;border-bottom:1px solid #d9d1c2;padding:30px 0}
.pick .tag{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#8a1c1c}
.pick img{width:100%;aspect-ratio:16/9;object-fit:cover;margin:16px 0;filter:saturate(.93)}
.pick h2{font-family:'Nanum Myeongjo',serif;font-size:31px;font-weight:800;line-height:1.25}
.pick .why{margin-top:14px;color:#2b2620}
.pick .why::first-letter{font-family:'Nanum Myeongjo',serif;font-size:3.2em;float:left;line-height:.78;padding:6px 10px 0 0;color:#8a1c1c}
.sec{margin:40px 0}
.sec>h3{font-family:'Nanum Myeongjo',serif;font-size:21px;border-bottom:1px solid #15130f;padding-bottom:7px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:baseline}
.sec>h3 span{font-family:'Nanum Gothic';font-size:10.5px;color:#6b6256;letter-spacing:.12em}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.card{display:block;color:inherit;text-decoration:none}
.card img{width:100%;aspect-ratio:3/2;object-fit:cover;border:1px solid #d9d1c2}
.card h4{font-weight:700;margin-top:11px;line-height:1.45;font-size:16px}
.card:hover h4{color:#8a1c1c}
.card p{color:#6b6256;font-size:13.5px;margin-top:6px}
.card .src{font-size:11px;color:#a99e8a;margin-top:7px}
.editorial{background:#efe9dc;padding:32px 28px;margin:46px 0;border:1px solid #d9d1c2}
.editorial h3{font-family:'Nanum Myeongjo',serif;font-size:23px;margin-bottom:12px}
.editorial p{font-size:15px;color:#352f27}
footer{text-align:center;color:#6b6256;font-size:12px;padding:30px 0 54px;border-top:3px double #15130f;margin-top:28px}
@media(max-width:640px){.cards{grid-template-columns:1fr}.masthead h1{font-size:33px}}
`;
function pageA() {
  const chips = C.breakdown.map((b) => `<span>${esc(b.label)} · ${b.count}</span>`).join("");
  const cardFn = (e) =>
    `<a class="card" href="${U(e.link)}" target="_blank" rel="noopener">${e.image ? `<img src="${U(e.image.url)}" alt="" loading="lazy">` : ""}<h4>${esc(e.headline)}</h4>${e.blurb ? `<p>${esc(e.blurb)}</p>` : ""}${e.outlet ? `<div class="src">${esc(e.outlet)}</div>` : ""}</a>`;
  const secWrap = (l, n, cards) => `<section class="sec"><h3>${esc(l)}<span>${n} SELECTED</span></h3><div class="cards">${cards}</div></section>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KCT · A 정통 매거진</title>${FONTS}<style>${cssA}</style></head><body><div class="wrap">
<header class="masthead"><div class="kicker">KOREAN CULTURE TIMES · ${esc(meta.weekRange.from)}–${esc(meta.weekRange.to)}</div><h1>${esc(meta.title)}</h1><div class="dek">${esc(meta.dek)}</div></header>
<div class="curation"><div class="lead">이번 주 쏟아진 <b>${C.scanned.toLocaleString()}건</b>의 한국 문화 뉴스 중, 편집 데스크 AI가 중요도를 가려 <b>${C.selected}건</b>만 추렸습니다.</div><div class="chips">${chips}</div></div>
<article class="pick"><div class="tag">EDITOR'S PICK · 이번 주의 픽</div>${editorPick.image ? `<img src="${U(editorPick.image.url)}" alt="">` : ""}<h2>${esc(editorPick.headline)}</h2><div class="why">${esc(editorPick.why)}</div></article>
${sections(cardFn, secWrap)}
${editorial ? `<section class="editorial"><h3>${esc(editorial.title)}</h3><p>${esc(editorial.bodyMarkdown)}</p></section>` : ""}
<footer>KCT — 매주 무료 한국 문화 카드뉴스 · AI 큐레이션</footer>
</div></body></html>`;
}

/* ───────────────── THEME B · 모던 임팩트 ───────────────── */
const cssB = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:#0b0b0f;font-family:'Nanum Gothic',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1040px;margin:0 auto;padding:0 24px}
.top{padding:26px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e7e9ef}
.top .logo{font-weight:800;font-size:20px;letter-spacing:-.02em}.top .logo span{color:#2b50ff}
.top .date{font-size:12.5px;color:#5b6170;font-weight:700}
.curation{background:#0b0b0f;color:#fff;border-radius:22px;padding:40px 34px;margin:30px 0}
.curation .kicker{color:#9aa6ff;font-weight:800;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
.curation h2{font-size:34px;font-weight:800;line-height:1.25;margin-top:14px;letter-spacing:-.02em}
.curation .stat{color:#ff3b6b}
.curation .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}
.curation .chips span{background:rgba(255,255,255,.1);border-radius:999px;padding:7px 14px;font-size:12.5px;color:#d6d9e6}
.curation .chips b{color:#9aa6ff}
.pick{margin:44px 0}
.pick .tag{display:inline-block;background:#2b50ff;color:#fff;font-weight:800;font-size:12px;padding:6px 13px;border-radius:999px;letter-spacing:.04em}
.pick img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:16px 0}
.pick h2{font-size:40px;font-weight:800;line-height:1.12;letter-spacing:-.03em}
.pick .why{margin-top:14px;color:#5b6170;font-size:16px;max-width:760px}
.sec{margin:48px 0}
.sec>h3{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#2b50ff;margin-bottom:22px;display:flex;align-items:center;gap:12px}
.sec>h3::after{content:"";flex:1;height:2px;background:#e7e9ef}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.card{display:block;color:inherit;text-decoration:none;border:1px solid #e7e9ef;border-radius:16px;overflow:hidden;transition:.18s}
.card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(11,11,15,.13);border-color:transparent}
.card img{width:100%;aspect-ratio:16/10;object-fit:cover;display:block}
.card .body{padding:15px 16px 18px}
.card h4{font-weight:800;line-height:1.35;font-size:16px;letter-spacing:-.01em}
.card p{color:#5b6170;font-size:13.5px;margin-top:7px}
.card .src{font-size:11px;color:#9aa1b2;margin-top:10px;font-weight:700}
.editorial{background:linear-gradient(135deg,#f4f6ff,#fff);border:1px solid #e7e9ef;border-radius:22px;padding:36px 32px;margin:48px 0}
.editorial .tag{color:#2b50ff;font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
.editorial h3{font-size:27px;font-weight:800;margin:10px 0 14px;letter-spacing:-.02em}
.editorial p{font-size:15.5px;color:#363b47}
footer{color:#5b6170;font-size:12.5px;padding:30px 0 56px;border-top:1px solid #e7e9ef;margin-top:30px}
@media(max-width:880px){.cards{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.cards{grid-template-columns:1fr}.pick h2{font-size:30px}.curation h2{font-size:26px}}
`;
function pageB() {
  const chips = C.breakdown.map((b) => `<span>${esc(b.label)} <b>${b.count}</b></span>`).join("");
  const cardFn = (e) =>
    `<a class="card" href="${U(e.link)}" target="_blank" rel="noopener">${e.image ? `<img src="${U(e.image.url)}" alt="" loading="lazy">` : ""}<div class="body"><h4>${esc(e.headline)}</h4>${e.blurb ? `<p>${esc(e.blurb)}</p>` : ""}${e.outlet ? `<div class="src">${esc(e.outlet)}</div>` : ""}</div></a>`;
  const secWrap = (l, n, cards) => `<section class="sec"><h3>${esc(l)}</h3><div class="cards">${cards}</div></section>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KCT · B 모던 임팩트</title>${FONTS}<style>${cssB}</style></head><body><div class="wrap">
<header class="top"><div class="logo">KCT<span>.</span></div><div class="date">${esc(meta.weekRange.from)} – ${esc(meta.weekRange.to)}</div></header>
<div class="curation"><div class="kicker">🤖 AI CURATION</div><h2>이번 주 쏟아진 <span class="stat">${C.scanned.toLocaleString()}건</span>의 한국 문화 뉴스 중,<br>AI가 중요도를 가려 <span class="stat">${C.selected}건</span>만 골랐습니다.</h2><div class="chips">${chips}</div></div>
<article class="pick"><span class="tag">EDITOR'S PICK</span><h2 style="margin-top:14px">${esc(editorPick.headline)}</h2>${editorPick.image ? `<img src="${U(editorPick.image.url)}" alt="">` : ""}<div class="why">${esc(editorPick.why)}</div></article>
${sections(cardFn, secWrap)}
${editorial ? `<section class="editorial"><div class="tag">EDITORIAL · 이번 주 총평</div><h3>${esc(editorial.title)}</h3><p>${esc(editorial.bodyMarkdown)}</p></section>` : ""}
<footer>KCT — 매주 무료 한국 문화 카드뉴스 · AI가 ${C.scanned.toLocaleString()}건에서 ${C.selected}건 엄선</footer>
</div></body></html>`;
}

/* ───────────────── THEME C · 소프트 프리미엄 ───────────────── */
const cssC = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(180deg,#fdf4ef,#fbf7f4 340px);color:#2a2530;font-family:'Nanum Gothic',sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
.wrap{max-width:960px;margin:0 auto;padding:0 22px}
.top{padding:30px 0 6px;text-align:center}.top .logo{font-weight:800;font-size:19px}.top .logo b{color:#ff7a59}
.top .date{font-size:12px;color:#a79db0;margin-top:4px}
.curation{background:linear-gradient(135deg,#fff,#fff6f2);border:1px solid #fadfd4;border-radius:26px;padding:32px 30px;margin:22px 0;box-shadow:0 18px 40px rgba(255,122,89,.1)}
.curation .kicker{display:inline-flex;align-items:center;gap:6px;background:#ffe9e1;color:#d2491f;font-weight:800;font-size:12.5px;padding:7px 14px;border-radius:999px}
.curation h2{font-size:27px;font-weight:800;line-height:1.35;margin-top:16px}.curation h2 b{color:#ff7a59}
.curation .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.curation .chips span{background:#fff;border:1px solid #efe7e0;border-radius:999px;padding:7px 14px;font-size:12.5px;color:#6f6678;box-shadow:0 2px 6px rgba(0,0,0,.03)}
.curation .chips b{color:#ff7a59}
.pick{background:#fff;border-radius:24px;padding:14px;margin:34px 0;box-shadow:0 16px 40px rgba(42,37,48,.08)}
.pick img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:18px}
.pick .inner{padding:20px 18px 12px}
.pick .tag{display:inline-block;background:#7c6bff;color:#fff;font-weight:800;font-size:11.5px;padding:5px 13px;border-radius:999px}
.pick h2{font-size:28px;font-weight:800;line-height:1.25;margin-top:12px}
.pick .why{margin-top:12px;color:#544d5e;font-size:15px}
.sec{margin:40px 0}
.sec>h3{font-size:19px;font-weight:800;margin-bottom:18px;display:flex;align-items:center}
.sec>h3 em{font-style:normal;color:#ff7a59;font-size:13px;margin-left:9px;background:#ffe9e1;padding:3px 11px;border-radius:999px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.card{display:block;color:inherit;text-decoration:none;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(42,37,48,.06);transition:.2s}
.card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(42,37,48,.13)}
.card img{width:100%;aspect-ratio:3/2;object-fit:cover;display:block}
.card .body{padding:16px 17px 18px}
.card h4{font-weight:800;line-height:1.4;font-size:15.5px}
.card p{color:#8a8295;font-size:13px;margin-top:7px}
.card .src{font-size:11px;color:#b3aab8;margin-top:9px}
.editorial{background:linear-gradient(135deg,#7c6bff,#9a7bff);color:#fff;border-radius:26px;padding:34px 30px;margin:46px 0;box-shadow:0 20px 44px rgba(124,107,255,.28)}
.editorial .tag{font-weight:800;font-size:12.5px;opacity:.85;letter-spacing:.08em;text-transform:uppercase}
.editorial h3{font-size:24px;font-weight:800;margin:10px 0 14px}
.editorial p{font-size:15px;color:rgba(255,255,255,.93)}
footer{text-align:center;color:#a79db0;font-size:12px;padding:28px 0 54px}
@media(max-width:600px){.cards{grid-template-columns:1fr}.curation h2{font-size:23px}}
`;
function pageC() {
  const chips = C.breakdown.map((b) => `<span>${esc(b.label)} <b>${b.count}</b></span>`).join("");
  const cardFn = (e) =>
    `<a class="card" href="${U(e.link)}" target="_blank" rel="noopener">${e.image ? `<img src="${U(e.image.url)}" alt="" loading="lazy">` : ""}<div class="body"><h4>${esc(e.headline)}</h4>${e.blurb ? `<p>${esc(e.blurb)}</p>` : ""}${e.outlet ? `<div class="src">${esc(e.outlet)}</div>` : ""}</div></a>`;
  const secWrap = (l, n, cards) => `<section class="sec"><h3>${esc(l)}<em>${n}건</em></h3><div class="cards">${cards}</div></section>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KCT · C 소프트 프리미엄</title>${FONTS}<style>${cssC}</style></head><body><div class="wrap">
<header class="top"><div class="logo">KCT<b>·</b> 한국문화타임스</div><div class="date">${esc(meta.weekRange.from)} – ${esc(meta.weekRange.to)}</div></header>
<div class="curation"><div class="kicker">🤖 AI 엄선 카드뉴스</div><h2>이번 주 쏟아진 <b>${C.scanned.toLocaleString()}건</b>의 한국 문화 뉴스 중,<br>AI가 중요도를 가려 <b>${C.selected}건</b>만 골랐어요.</h2><div class="chips">${chips}</div></div>
<article class="pick">${editorPick.image ? `<img src="${U(editorPick.image.url)}" alt="">` : ""}<div class="inner"><span class="tag">이번 주의 픽</span><h2>${esc(editorPick.headline)}</h2><div class="why">${esc(editorPick.why)}</div></div></article>
${sections(cardFn, secWrap)}
${editorial ? `<section class="editorial"><div class="tag">이번 주 총평</div><h3>${esc(editorial.title)}</h3><p>${esc(editorial.bodyMarkdown)}</p></section>` : ""}
<footer>KCT — 매주 무료 한국 문화 카드뉴스 💌</footer>
</div></body></html>`;
}

/* ───────────────── index ───────────────── */
const indexHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KCT 디자인 샘플</title>${FONTS}<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Nanum Gothic',sans-serif;background:#f3f4f6;color:#111;padding:40px 20px}
.wrap{max-width:760px;margin:0 auto}h1{font-size:26px;font-weight:800}p.sub{color:#666;margin:8px 0 26px}
.opt{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px 24px;margin-bottom:14px;transition:.15s}
.opt:hover{border-color:#2b50ff;transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.08)}
.opt h2{font-size:19px;font-weight:800}.opt span{color:#666;font-size:14px;display:block;margin-top:5px}
.tag{font-size:12px;font-weight:800;color:#2b50ff;letter-spacing:.08em}
</style></head><body><div class="wrap">
<h1>KCT 디자인 샘플 — ${esc(meta.title)}</h1>
<p class="sub">동일한 ${slug}호 콘텐츠를 3가지 디자인으로 렌더했습니다. 하나 고르세요.</p>
<a class="opt" href="a.html"><span class="tag">DESIGN A</span><h2>정통 매거진</h2><span>명조 헤드라인 · 더블 룰 · 드롭캡 · 여백 — 우아하고 클래식한 인쇄 매거진 느낌</span></a>
<a class="opt" href="b.html"><span class="tag">DESIGN B</span><h2>모던 임팩트</h2><span>볼드 타이포 · 고대비 · 강조색 통계 블록 · 3열 그리드 — 트렌디한 디지털 뉴스</span></a>
<a class="opt" href="c.html"><span class="tag">DESIGN C</span><h2>소프트 프리미엄</h2><span>라운드 카드 · 소프트 섀도 · 따뜻한 그라데이션 — 친근한 앱 느낌</span></a>
</div></body></html>`;

const outDir = ".design-samples";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "a.html"), pageA());
fs.writeFileSync(path.join(outDir, "b.html"), pageB());
fs.writeFileSync(path.join(outDir, "c.html"), pageC());
fs.writeFileSync(path.join(outDir, "index.html"), indexHtml);
const cards = categories.reduce((s, c) => s + c.entries.length, 0);
console.log(`✅ 디자인 샘플 3종 생성 (${slug}호 · 카드 ${cards}개) → ${outDir}/{index,a,b,c}.html`);
