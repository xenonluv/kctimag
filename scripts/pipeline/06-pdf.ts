// PDF 단계 — 렌더된 인쇄 경로(/issues/{slug}/print)를 Puppeteer로 PDF 변환.
// 실행 머신에서 사이트가 떠 있어야 한다(로컬 next start 또는 배포된 URL).
//   PDF_BASE_URL 기본값: http://localhost:3000
import "@/lib/load-env";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "@/lib/paths";
import { uploadPdf } from "@/lib/storage";

export async function generatePdf(slug: string): Promise<string> {
  // 동적 import: puppeteer 미설치 환경(웹 빌드 등)에서 로드 실패 방지
  const puppeteer = (await import("puppeteer")).default;
  const launchOpts: Parameters<typeof puppeteer.launch>[0] = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  // 시스템 Chrome 경로 지정 가능(번들 Chromium 미설치 환경 대비)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    const base = process.env.PDF_BASE_URL || "http://localhost:3000";
    const url = `${base}/issues/${slug}/print`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 90_000 });
    // 이미지 로딩 대기 (Pollinations 등 외부 이미지)
    await page
      .evaluate(
        () =>
          Promise.all(
            Array.from(document.images).map((img) =>
              img.complete
                ? null
                : new Promise((res) => {
                    img.onload = img.onerror = () => res(null);
                  }),
            ),
          ),
      )
      .catch(() => {});

    const outDir = path.join(process.cwd(), ".out-pdf");
    ensureDir(outDir);
    const outPath = path.join(outDir, `${slug}.pdf`);
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "8mm", bottom: "8mm", left: "10mm", right: "10mm" },
    });
    return outPath;
  } finally {
    await browser.close();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const slug = process.argv[2] || new Date().toISOString().slice(0, 10);
  generatePdf(slug)
    .then(async (p) => {
      console.log(`✅ PDF 생성: ${p}`);
      const url = await uploadPdf(slug, p).catch((e) => {
        console.warn("  (Storage 업로드 건너뜀:", (e as Error).message, ")");
        return null;
      });
      if (url) console.log(`   업로드 → ${url}`);
    })
    .catch((e) => {
      console.error("❌ PDF 실패:", e);
      process.exit(1);
    });
}
