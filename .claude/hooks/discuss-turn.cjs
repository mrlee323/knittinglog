#!/usr/bin/env node
/**
 * docs/discuss/ 스레드 중 내 차례인 것을 찾아 알린다.
 *
 * **훅으로 할 수 있는 것과 없는 것.**
 * Claude Code 훅은 이 세션의 사건(프롬프트 제출·세션 시작·도구 사용)에 걸린다.
 * Codex가 파일을 쓰는 순간은 이 세션의 사건이 아니므로 그때 깨어날 수는 없다.
 * 대신 **다음에 사용자가 무엇을 입력하든 그 순간 확인한다** — 사용자가
 * "코덱스 답 왔어"라고 설명할 필요가 없어지는 것이 이 훅의 목적이다.
 *
 * 조용해야 한다. 내 차례인 스레드가 없으면 아무것도 출력하지 않는다 —
 * 매 프롬프트마다 붙는 잡음은 몇 번 지나면 읽히지 않게 된다.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const dir = path.join(root, "docs", "discuss");

/**
 * 이 세션의 이름. `기획` | `구현` | `검증` 중 하나를 DISCUSS_ME로 받는다.
 * 없으면 아무것도 하지 않는다 — 기본값을 두면 두 세션이 같은 스레드에 답한다.
 */
const me = process.env.DISCUSS_ME;
if (!me) process.exit(0);

/**
 * 아주 얕은 머리말 파서. 이 폴더의 머리말은 한 줄에 `키: 값`뿐이다.
 *
 * 값 뒤의 `# 주석`은 떼어낸다 — README의 표준 예시가 주석을 달고 있어서
 * 그대로 따라 쓰면 `turn`이 "기획 # 기획 | 구현 | …" 통째가 되어 이름 비교가
 * 조용히 실패한다. YAML대로 **앞에 공백이 있는 `#`**만 주석으로 본다.
 */
function frontMatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const out = {};
  for (const line of text.slice(3, end).split("\n")) {
    const m = /^\s*([a-z_]+)\s*:\s*(.*?)\s*$/i.exec(line);
    if (m) {
      const value = m[2].replace(/\s+#.*$/, "").trim();
      out[m[1]] = value.replace(/^["']|["']$/g, "");
    }
  }
  return out;
}

/** 상대가 마지막으로 쓴 글의 첫 문단. 무엇을 물었는지 바로 보이게 한다. */
function lastEntry(text) {
  const parts = text.split(/^### /m);
  const last = parts[parts.length - 1];
  if (parts.length < 2) return "";
  const body = last.split("\n").slice(1).join("\n").trim();
  return body.split("\n\n")[0].replace(/\s+/g, " ").slice(0, 300);
}

let mine = [];
try {
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md") || name === "README.md") continue;
    const file = path.join(dir, name);
    const text = fs.readFileSync(file, "utf8");
    const fm = frontMatter(text);
    if (!fm) continue;
    if (fm.turn !== me) continue;
    if (fm.status && fm.status !== "open") continue;
    mine.push({
      file: `docs/discuss/${name}`,
      title: fm.title || name,
      rounds: Number(fm.rounds || 0),
      last: lastEntry(text),
    });
  }
} catch {
  // 폴더가 없으면 할 일도 없다
  process.exit(0);
}

if (mine.length === 0) process.exit(0);

const lines = ["논의 스레드에 내 차례가 있습니다. 이 턴에서 먼저 처리합니다.", ""];
for (const t of mine) {
  lines.push(`- ${t.file} — "${t.title}" (${t.rounds}왕복)`);
  if (t.last) lines.push(`  상대의 마지막 말: ${t.last}`);
}
lines.push(
  "",
  `규약은 docs/discuss/README.md에 있습니다. 나는 ${me}입니다. 요점: 남의 글은 고치지 않고`,
  "덧붙이기만, 근거에는 파일·줄 번호나 잰 숫자를 붙이고, 동의할 때도 이유를 적고,",
  "쓰고 나면 turn을 다음 차례에게 넘깁니다. 한 바퀴(기획→구현→검증)가 끝나면 rounds를",
  "올리고, rounds가 3이면 turn: 사람."
);

process.stdout.write(
  JSON.stringify({
    systemMessage: `논의 ${mine.length}건이 내 차례입니다 (${mine.map((t) => t.file.replace("docs/discuss/", "")).join(", ")})`,
    hookSpecificOutput: {
      hookEventName: process.env.CLAUDE_HOOK_EVENT || "UserPromptSubmit",
      additionalContext: lines.join("\n"),
    },
  })
);
