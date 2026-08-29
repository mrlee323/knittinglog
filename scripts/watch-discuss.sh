#!/usr/bin/env bash
#
# docs/discuss/ 에서 내 차례가 된 스레드를 감시한다.
#
# 훅은 이 세션의 사건(프롬프트 제출·세션 시작)에만 걸리므로 다른 자리가 파일을
# 쓰는 순간을 잡지 못한다. 이 스크립트는 그 구멍을 메운다 — Monitor 도구가 이걸
# 돌리고 **표준출력 한 줄이 알림 하나**가 되어 세션을 깨운다.
#
# **두 곳을 본다.**
#   1. 워킹 트리 — 세 자리가 같은 폴더를 쓰면 상대가 저장하는 즉시 보인다.
#      커밋도 push도 기다리지 않는다.
#   2. origin/<브랜치> — 다른 머신이나 클라우드 세션이 push한 것.
# 둘 중 어느 쪽이 먼저 오든 한 번만 알린다(내용 해시로 거른다).
#
# **브랜치를 고정하지 않는다.** 인자를 주지 않으면 매 바퀴 HEAD를 다시 읽으므로,
# 작업이 끝나 새 브랜치로 옮겨가도 감시자를 다시 띄울 필요가 없다.
#
# 조용한 것이 정상이 아니다 — fetch가 계속 실패하면 감시가 멈춘 것과 같으므로
# 그것도 알린다.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

PIN_BRANCH="${1:-}"          # 주면 그 브랜치에 고정, 안 주면 HEAD를 따라간다
INTERVAL="${WATCH_INTERVAL:-60}"

# 이 세션의 이름. 기본값을 두지 않는다 — 틀린 이름으로 감시하면 조용한 것과
# 구분되지 않는다. 없으면 감시를 시작하지 않고 왜인지 말한다.
ME="${DISCUSS_ME:-}"
if [ -z "$ME" ]; then
  echo "감시를 시작할 수 없습니다: DISCUSS_ME가 비어 있습니다. 기획|구현|검증 중 하나를 주세요."
  exit 1
fi

seen=""      # 이미 알린 내용의 해시. 같은 글을 두 번 알리지 않는다.
fails=0
last_branch=""

# 머리말을 읽고 내 차례면 한 줄 알린다. $1=출처 라벨 $2=파일경로 $3=머리말
consider() {
  local where="$1" file="$2" head="$3" hash title rounds
  hash=$(printf '%s' "$head" | shasum | cut -d' ' -f1)
  case " $seen " in *" $hash "*) return ;; esac
  seen="$seen $hash"
  printf '%s' "$head" | grep -q '^status: *open' || return
  # 값 뒤의 `# 주석`을 떼고 정확히 비교한다. 접두사 매칭은 다른 이름을 오인한다.
  local turn
  turn=$(printf '%s' "$head" | sed -n 's/^turn: *//p' | sed 's/[[:space:]]*#.*$//' | tr -d '[:space:]')
  [ "$turn" = "$ME" ] || return
  title=$(printf '%s' "$head" | sed -n 's/^title: *//p' | sed 's/[[:space:]]*#.*$//')
  rounds=$(printf '%s' "$head" | sed -n 's/^rounds: *//p' | sed 's/[[:space:]]*#.*$//' | tr -d '[:space:]')
  echo "$ME 차례입니다 — $file · \"$title\" · ${rounds:-?}왕복 ($where). docs/discuss/README.md 규약대로 답하세요."
}

while true; do
  BRANCH="${PIN_BRANCH:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null)}"
  if [ -n "$BRANCH" ] && [ "$BRANCH" != "$last_branch" ]; then
    [ -n "$last_branch" ] && echo "감시 브랜치가 바뀌었습니다: $last_branch → $BRANCH"
    last_branch="$BRANCH"
  fi

  # 1) 워킹 트리 — 같은 폴더를 쓰는 자리는 저장 즉시 보인다
  for f in docs/discuss/*.md; do
    [ -e "$f" ] || continue
    case "$f" in */README.md) continue ;; esac
    consider "워킹 트리" "$f" "$(head -20 "$f")"
  done

  # 2) origin — 다른 머신·클라우드 세션이 push한 것
  if git fetch -q origin "$BRANCH" 2>/dev/null; then
    [ "$fails" -ge 3 ] && echo "복구: git fetch가 다시 됩니다."
    fails=0
    files=$(git ls-tree -r --name-only "origin/$BRANCH" -- docs/discuss 2>/dev/null \
            | grep -E '\.md$' | grep -v 'README\.md' || true)
    for f in $files; do
      head=$(git show "origin/$BRANCH:$f" 2>/dev/null | head -20) || continue
      consider "origin/$BRANCH" "$f" "$head"
    done
  else
    fails=$((fails + 1))
    # 세 번 연속이면 원격 감시는 사실상 멈춘 것이다. 워킹 트리 감시는 살아 있다.
    [ "$fails" -eq 3 ] && echo "경고: git fetch가 3회 연속 실패했습니다($BRANCH). 원격은 지금 못 보고 있습니다 — 워킹 트리만 봅니다."
  fi

  sleep "$INTERVAL"
done
