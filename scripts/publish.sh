#!/usr/bin/env bash
# 발행 — 검수한 기존 issue.json을 재생성 없이 push→Vercel 발행 + PDF 생성·업로드 + 보존정리.
#   구독자 메일은 발송하지 않음(/admin 에서 수동). 먼저 ./scripts/make.sh 로 제작·검수할 것.
#   사용: ./scripts/publish.sh [YYYY-MM-DD]   (생략 시 오늘 날짜)
set -euo pipefail

SLUG="${1:-$(date +%F)}"

# nvm 로드
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(cd "$(dirname "$0")/.." && pwd)"

# 배포 폴링·PDF가 라이브 사이트를 타도록 (dotenv는 override:false → .env.local 의 localhost 를 안전하게 덮어씀)
export NEXT_PUBLIC_SITE_URL="${SITE_URL:-https://kctimag.vercel.app}"

if [ ! -f "content/events/${SLUG}/events.json" ]; then
  echo "⚠️ content/events/${SLUG}/events.json 없음 — 이벤트 페이지는 최신 생성본이 없을 수 있습니다."
fi

echo "🚀 ${SLUG}호 발행 (검수본 그대로 push→Vercel, 구독자 메일 제외)…"
PUBLISH_ONLY=1 SKIP_EMAIL=1 npx tsx scripts/pipeline/run.ts "$SLUG"

echo ""
echo "✅ 발행 완료 → https://kctimag.vercel.app/issues/${SLUG}"
echo "   📧 구독자 메일은 /admin 에서 직접 작성·발송하세요."
