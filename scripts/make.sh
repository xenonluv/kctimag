#!/usr/bin/env bash
# 제작·검수 — 새 호 생성(수집→큐레이션→이미지→조립→CEO검증→빌드) 후 로컬 서버로 검수.
#   push/PDF/메일 없음. 마음에 들면 ./scripts/publish.sh 로 발행.
#   사용: ./scripts/make.sh [YYYY-MM-DD]   (생략 시 오늘 날짜)
set -euo pipefail

SLUG="${1:-$(date +%F)}"

# nvm 로드 (node/tsx/codex)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$(cd "$(dirname "$0")/.." && pwd)"

echo "📰 ${SLUG}호 제작 (생성 + CEO 검증 + 빌드)…"
npx tsx scripts/pipeline/events/run-events.ts "$SLUG" || echo "⚠️ 이벤트 생성 실패 — 뉴스 제작은 계속(빈 events.json 폴백)"
LLM_PROVIDER="${LLM_PROVIDER:-codex}" npx tsx scripts/pipeline/run.ts "$SLUG"

echo ""
echo "🔍 검수: http://localhost:3000/issues/${SLUG}   (확인 후 Ctrl+C)"
echo "   이벤트: http://localhost:3000/events"
echo "   마음에 들면 발행:  ./scripts/publish.sh ${SLUG}"
echo ""
npx next start
