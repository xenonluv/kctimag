#!/usr/bin/env bash
# launchd가 호출하는 주간 발행 래퍼 (Mac Studio, 24시간 상시 가동).
set -euo pipefail

# Homebrew + 시스템 경로
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# nvm 로드 (node/claude 경로 확보)
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# 프로젝트 루트로 이동 (이 스크립트: <root>/scripts/launchd/run-weekly.sh)
cd "$(dirname "$0")/../.." || exit 1

SLUG="$(date +%Y-%m-%d)"
mkdir -p logs
LOG="logs/weekly-$SLUG.log"

echo "=== KCT weekly run: $SLUG ($(date)) ===" >> "$LOG"

# 실제 발행(생성 → CEO 게이트 → git push → Vercel → PDF → 메일)
PUBLISH=1 npx tsx scripts/pipeline/run.ts "$SLUG" >> "$LOG" 2>&1
STATUS=$?

echo "=== 종료 코드: $STATUS ($(date)) ===" >> "$LOG"
exit $STATUS
