// Supabase keep-alive — 무료 플랜 자동 일시정지(약 1주 무활동) 방지용.
// 발행/메일과 무관. subscribers 테이블에 가벼운 조회 1건만 보내 "활동 중" 상태 유지.
// launchd(com.kctimag.keepalive.plist)가 주 2회 실행. 수동 실행: `node scripts/keepalive.mjs`
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LOG = path.join(ROOT, ".pipeline-tmp", "keepalive.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, line);
  } catch {}
  process.stdout.write(line);
}

// .env.local 로드 (launchd는 쉘 환경을 안 물려주므로 직접 파싱)
function loadEnv() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = raw.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    log("SKIP: Supabase 환경변수 없음");
    process.exit(0);
  }
  try {
    // HEAD + count: 데이터 전송 없이 테이블 접근만 → 가장 가벼운 활동 신호
    const res = await fetch(`${url}/rest/v1/subscribers?select=email&limit=1`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      log(`OK ping (HTTP ${res.status})`);
      process.exit(0);
    } else {
      log(`WARN 응답 HTTP ${res.status}`);
      process.exit(0); // 실패해도 launchd 재시도 폭주 막기 위해 정상 종료
    }
  } catch (e) {
    log(`ERROR ${e?.message ?? e}`);
    process.exit(0);
  }
}

main();
