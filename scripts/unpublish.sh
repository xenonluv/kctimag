#!/usr/bin/env bash
# 발행취소 — 발행된 호를 git에서 삭제하고 push → Vercel 재배포로 사이트에서 내린다.
#   content/issues/<slug> (+ 있으면 content/events/<slug>)를 삭제 커밋·푸시.
#   사용: ./scripts/unpublish.sh <YYYY-MM-DD> [YYYY-MM-DD ...]
#   확인 없이 실행: FORCE=1 ./scripts/unpublish.sh <slug>
#   ⚠️ 이미 발송된 구독자 메일은 회수되지 않으며, Supabase send_logs 기록은 남습니다.
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

if [ "$#" -lt 1 ]; then
  echo "사용법: ./scripts/unpublish.sh <YYYY-MM-DD> [YYYY-MM-DD ...]" >&2
  echo "" >&2
  echo "현재 발행된 호:" >&2
  ls content/issues 2>/dev/null | sed 's/^/  - /' >&2 || echo "  (없음)" >&2
  exit 1
fi

# 존재 검증 — content/issues/<slug> 있는 것만 대상으로
targets=()
for SLUG in "$@"; do
  if [ -d "content/issues/$SLUG" ]; then
    targets+=("$SLUG")
  else
    echo "⚠️ content/issues/$SLUG 없음 — 건너뜀" >&2
  fi
done
[ "${#targets[@]}" -gt 0 ] || { echo "❌ 삭제할 발행 호가 없습니다." >&2; exit 1; }

echo "다음 호를 사이트에서 내립니다 (git 삭제 → push → Vercel 재배포):"
for SLUG in "${targets[@]}"; do echo "  - $SLUG"; done

if [ "${FORCE:-0}" != "1" ]; then
  # set -e 하에서 비대화형/EOF(파이프·cron)면 read가 비0 반환 → ||로 받아 '취소'로 처리
  read -r -p "정말 삭제할까요? [y/N] " ans || ans=""
  case "$ans" in
    [yY]|[yY][eE][sS]) ;;
    *) echo "취소했습니다."; exit 0 ;;
  esac
fi

paths=()
for SLUG in "${targets[@]}"; do
  removed=0
  if [ -n "$(git ls-files "content/issues/$SLUG")" ]; then
    git rm -r --ignore-unmatch -- "content/issues/$SLUG" >/dev/null
    paths+=("content/issues/$SLUG"); removed=1
  fi
  if [ -n "$(git ls-files "content/events/$SLUG")" ]; then
    git rm -r --ignore-unmatch -- "content/events/$SLUG" >/dev/null
    paths+=("content/events/$SLUG"); removed=1
  fi
  rm -rf "content/issues/$SLUG" "content/events/$SLUG"  # 비추적 잔여까지 로컬 정리
  [ "$removed" -eq 1 ] || echo "ℹ️ $SLUG 은 git 미추적(미발행) — 로컬만 삭제"
done

if [ "${#paths[@]}" -eq 0 ]; then
  echo "git에 발행된 호가 없어 커밋·push 생략 (미발행 호는 로컬만 삭제됨)."
  exit 0
fi

# ⚠️ 인덱스에 남아있을 수 있는 다른 스테이지 변경을 휩쓸지 않도록, 삭제한 호 경로만 커밋한다.
git commit -m "발행취소: $(IFS=,; echo "${targets[*]}")호 사이트에서 내림" -- "${paths[@]}"
git push origin main

echo ""
echo "✅ 삭제 완료 → Vercel 재배포 후 사이트/목록에서 제거됩니다."
echo "   (이미 발송된 구독자 메일은 회수되지 않으며, Supabase send_logs 기록은 남습니다.)"
