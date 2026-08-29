#!/usr/bin/env bash
#
# 지금 브랜치의 작업을 끝내고 main에 머지한다.
#
#   ./scripts/finish-work.sh --yes
#
# **--yes 없이는 무엇을 할지 보여주기만 한다.** main에 머지하는 것은 되돌리기
# 번거롭고, 세 자리가 같은 워킹 트리를 쓰므로 브랜치 전환이 나머지 둘에게도
# 영향을 준다. 눌러보고 나서 알게 되면 안 된다.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

YES=0; SKIP_CHECKS=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    *) echo "모르는 인자: $a"; exit 1 ;;
  esac
done

BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] && { echo "중단: 이미 main입니다."; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "중단: 커밋되지 않은 변경이 있습니다. 다른 자리가 쓰는 중일 수 있습니다."
  echo; git status --short
  exit 1
fi

# 열린 논의를 남겨둔 채 머지하면 그 결정은 어디에도 반영되지 않는다(규칙 7).
open_threads=$(grep -l '^status: *open' docs/discuss/[0-9]*.md 2>/dev/null || true)
if [ -n "$open_threads" ]; then
  echo "경고: 아직 열린 논의가 있습니다 —"
  for f in $open_threads; do
    echo "  $f (차례: $(sed -n 's/^turn: *//p' "$f" | sed 's/[[:space:]]*#.*$//'))"
  done
  echo "규칙 7: 결정은 밖으로 나가야 합니다. 그래도 머지하려면 그대로 진행하세요."
  echo
fi

git fetch -q origin main 2>/dev/null
AHEAD=$(git rev-list --count origin/main..HEAD)
echo "브랜치: $BRANCH"
echo "main보다 앞선 커밋: $AHEAD"
git log --oneline origin/main..HEAD | sed 's/^/  /'
echo

if [ "$YES" -ne 1 ]; then
  echo "실제로 머지하려면 --yes 를 붙이세요:"
  echo "  ./scripts/finish-work.sh --yes"
  exit 0
fi

if [ "$SKIP_CHECKS" -ne 1 ]; then
  echo "검사를 돌립니다 (건너뛰려면 --skip-checks)…"
  npm run test --silent || { echo "중단: 테스트 실패."; exit 1; }
  npm run type-check --silent || { echo "중단: 타입 검사 실패."; exit 1; }
  npm run lint --silent || { echo "중단: lint 실패."; exit 1; }
fi

git push -q origin "$BRANCH" || { echo "중단: 브랜치 push 실패."; exit 1; }
git checkout -q main || exit 1
git pull --rebase -q origin main || { echo "중단: main을 당기지 못했습니다."; exit 1; }
# AGENTS.md 규칙: 머지는 --no-ff. 브랜치의 왕복이 이력에 남아야 한다.
git merge --no-ff -q "$BRANCH" -m "Merge branch '$BRANCH'" || {
  echo "중단: 머지 충돌. 풀고 나서 'git merge --continue' 하세요."; exit 1; }
git push -q origin main || { echo "중단: main push 실패."; exit 1; }

echo
echo "머지했습니다: $BRANCH → main (origin 반영)"
echo "다음 작업은:  ./scripts/new-work.sh <새-브랜치명>"
