#!/usr/bin/env bash
#
# 지우기 전에 **잃는 것이 없는지** 본다 (discuss/018의 남은 일).
#
# O4가 "머지 뒤 내 커밋이 main에 들어갔나"를 보는 자리를 만들었다. 이건 그
# 반대쪽이다 — **브랜치를 지워도 되나.** 둘은 다른 질문이다. 커밋이 남아
# 있어도 그 내용이 이미 트리에 있으면 지워도 된다.
#
# **커밋이 아니라 줄을 센다.** `git branch --merged`는 커밋 조상만 본다.
# 018이 찾은 세 커밋은 전부 조상이 아니었는데, 줄로 세보니 셋 중 둘은 내용이
# 이미 main에 있었다 — 사람이 같은 내용을 다시 쓴 것이다. 커밋만 보면 셋 다
# "잃는다"고 나오고, 그러면 아무것도 못 지운다.
#
# 남는 줄이 있으면 **판정하지 않는다.** 그 줄을 그대로 찍고 사람에게 넘긴다 —
# 낡아서 대체된 줄과 진짜로 잃는 줄을 기계가 못 가른다. 실제로 `a6b38da`의
# 32줄은 전부 010·011이 근거를 달고 취소선을 그은 낡은 표였다.
#
# **변수 이름은 ASCII다.** bash는 한글 변수명을 할당으로 안 읽고 명령으로
# 읽는다 — `이름=값`이 `command not found`가 되고, 그 뒤 `$이름`은 빈 문자열이
# 되어 **조건이 조용히 뒤집힌다.** O4에서 한 번 겪었고 여기서 또 겪었다.
#
#   ./scripts/branch-audit.sh            # 전부
#   ./scripts/branch-audit.sh fix/foo    # 하나만
#
# 종료코드: 0 전부 지워도 됨 · 1 사람이 봐야 할 브랜치가 있음 · 2 환경 문제
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

if ! git fetch origin --prune -q; then
  echo "환경 문제: origin에서 fetch하지 못했습니다."
  exit 2
fi

ONLY="${1:-}"
needs_review=0
review_dir=$(mktemp -d)
trap 'rm -rf "$review_dir"' EXIT

echo "| 브랜치 | main에 없는 커밋 | 트리에 없는 줄 | 판정 |"
echo "| ------ | ---------------- | -------------- | ---- |"

for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v 'origin/main$' | grep -v 'HEAD'); do
  b="${ref#origin/}"
  if [ -n "$ONLY" ] && [ "$b" != "$ONLY" ]; then continue; fi

  n=$(git rev-list --count "origin/main..$ref")
  if [ "$n" = "0" ]; then
    printf "| %s | 0 | — | 지워도 된다 |\n" "$b"
    continue
  fi

  # 그 커밋들이 **더한 줄**. 빈 줄과 diff 머리말은 뺀다.
  added=$(mktemp)
  for c in $(git rev-list "origin/main..$ref"); do
    git show "$c" | grep '^+' | grep -v '^+++' | sed 's/^+//' | grep -v '^[[:space:]]*$'
  done | sort -u > "$added"

  missing="$review_dir/$(printf '%s' "$b" | tr '/' '_')"
  : > "$missing"
  while IFS= read -r line; do
    # 추적되는 파일 전체에서 찾는다. 경로를 좁히면 옮겨간 내용을 놓친다.
    if ! git grep -qF -- "$line" HEAD 2>/dev/null; then
      printf '%s\n' "$line" >> "$missing"
    fi
  done < "$added"
  rm -f "$added"

  lost=$(wc -l < "$missing" | tr -d ' ')
  if [ "$lost" = "0" ]; then
    printf "| %s | %s | 0 | 내용은 트리에 있다 — 지워도 된다 |\n" "$b" "$n"
    rm -f "$missing"
  else
    printf "| %s | %s | **%s** | 사람이 본다 |\n" "$b" "$n" "$lost"
    needs_review=1
  fi
done

if [ "$needs_review" = "1" ]; then
  echo
  echo "트리에 없는 줄 — **낡아서 대체된 것인지 진짜로 잃는 것인지는 사람이 가른다.**"
  for f in "$review_dir"/*; do
    [ -e "$f" ] || continue
    echo
    echo "### $(basename "$f" | tr '_' '/')"
    sed 's/^/  /' "$f"
  done
  exit 1
fi

echo
echo "전부 지워도 됩니다."
