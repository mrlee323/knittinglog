#!/usr/bin/env bash
#
# 새 작업 브랜치를 열고 세 자리가 모두 들어올 수 있게 origin에 올린다.
#
#   ./scripts/new-work.sh feat/chart-export
#
# **왜 스크립트인가.** 세 자리가 같은 워킹 트리를 공유하므로 브랜치를 바꾸면
# 나머지 둘의 발밑도 같이 바뀐다. 손으로 하면 누군가 쓰던 중에 갈아치우게 된다.
# 여기서는 그걸 먼저 확인하고, 안 되면 시작하지 않는다.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

BRANCH="${1:-}"
if [ -z "$BRANCH" ]; then
  echo "사용법: ./scripts/new-work.sh <브랜치명>"
  echo "  예:   ./scripts/new-work.sh feat/chart-export"
  echo "  접두사는 feat/ fix/ docs/ chore/ 중 하나를 쓴다."
  exit 1
fi
case "$BRANCH" in
  feat/*|fix/*|docs/*|chore/*) ;;
  *) echo "경고: '$BRANCH'는 이 저장소의 작명 규칙(feat/ fix/ docs/ chore/)과 다릅니다." ;;
esac

if git show-ref --verify -q "refs/heads/$BRANCH"; then
  echo "중단: 브랜치 '$BRANCH'가 이미 있습니다."
  exit 1
fi

# 다른 자리가 쓰던 중일 수 있다. 브랜치를 갈아치우면 그 작업이 딸려간다.
if [ -n "$(git status --porcelain)" ]; then
  echo "중단: 커밋되지 않은 변경이 있습니다. 다른 자리가 쓰는 중일 수 있습니다."
  echo
  git status --short
  echo
  echo "먼저 커밋하거나, 누가 쓰고 있는지 확인한 뒤 다시 실행하세요."
  exit 1
fi

echo "main을 최신으로 맞춥니다…"
git checkout -q main || exit 1
git pull --rebase -q origin main || { echo "중단: main을 당기지 못했습니다."; exit 1; }

echo "브랜치를 만듭니다: $BRANCH"
git checkout -q -b "$BRANCH" || exit 1

# origin에 올려야 다른 머신·클라우드 세션도 들어올 수 있고, 감시자가 fetch한다.
git push -q -u origin "$BRANCH" || { echo "중단: push 실패."; exit 1; }

echo
echo "열었습니다: $BRANCH (origin에 올림)"
echo
echo "세 자리 모두 이 브랜치에서 일합니다. 각 세션에서 할 것:"
echo "  기획(Codex)          — 이 폴더에서 그대로 이어서 작업"
echo "  구현(Claude Code CLI) — 이 폴더에서 그대로 이어서 작업"
echo "  검증(Claude Code 데스크탑) — 이 폴더에서 그대로 이어서 작업"
echo
echo "감시자는 브랜치를 고정하지 않으므로 다시 띄울 필요가 없습니다."
