#!/usr/bin/env bash
#
# docs/discuss/ 에서 내 차례가 된 스레드를 감시한다.
#
# 훅은 이 세션의 사건(프롬프트 제출·세션 시작)에만 걸리므로 Codex가 파일을 쓰는
# 순간을 잡지 못한다. 이 스크립트는 그 구멍을 메운다 — Monitor 도구가 이걸 돌리고
# **표준출력 한 줄이 알림 하나**가 되어 세션을 깨운다.
#
# 원격 세션이라 저장소를 공유하지 않으므로 origin을 본다. Codex가 로컬에서 쓰고
# push하면 여기서 fetch로 받는다. 같은 폴더에서 도는 경우에도 그대로 동작한다.
#
# 조용한 것이 정상이 아니다 — fetch가 계속 실패하면 감시가 멈춘 것과 같으므로
# 그것도 알린다.
set -uo pipefail

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
INTERVAL="${WATCH_INTERVAL:-60}"

# 이 세션의 이름. 기본값을 두지 않는다 — 틀린 이름으로 감시하면 조용한 것과
# 구분되지 않는다. 없으면 감시를 시작하지 않고 왜인지 말한다.
ME="${DISCUSS_ME:-}"
if [ -z "$ME" ]; then
  echo "감시를 시작할 수 없습니다: DISCUSS_ME가 비어 있습니다. 기획|구현|검증 중 하나를 주세요."
  exit 1
fi

seen=""      # 이미 본 blob 해시. 같은 내용을 두 번 알리지 않는다.
fails=0

while true; do
  if git fetch -q origin "$BRANCH" 2>/dev/null; then
    [ "$fails" -ge 3 ] && echo "복구: git fetch가 다시 됩니다."
    fails=0

    files=$(git ls-tree -r --name-only "origin/$BRANCH" -- docs/discuss 2>/dev/null \
            | grep -E '\.md$' | grep -v 'README\.md' || true)

    for f in $files; do
      blob=$(git rev-parse "origin/$BRANCH:$f" 2>/dev/null) || continue
      case " $seen " in *" $blob "*) continue ;; esac
      seen="$seen $blob"

      head=$(git show "origin/$BRANCH:$f" 2>/dev/null | head -20) || continue
      printf '%s' "$head" | grep -q '^status: *open' || continue
      printf '%s' "$head" | grep -q "^turn: *$ME" || continue

      title=$(printf '%s' "$head" | sed -n 's/^title: *//p')
      rounds=$(printf '%s' "$head" | sed -n 's/^rounds: *//p')
      echo "$ME 차례입니다 — $f · \"$title\" · ${rounds:-?}왕복. docs/discuss/README.md 규약대로 답하세요."
    done
  else
    fails=$((fails + 1))
    # 세 번 연속이면 감시가 사실상 멈춘 것이다. 조용히 있으면 안 된다.
    [ "$fails" -eq 3 ] && echo "경고: git fetch가 3회 연속 실패했습니다. 이 감시는 지금 아무것도 못 보고 있습니다."
  fi
  sleep "$INTERVAL"
done
