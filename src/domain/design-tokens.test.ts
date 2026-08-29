/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/domain/color";

/**
 * `docs/DESIGN.md`가 정한 값이 코드에 실제로 들어갔는지 지킨다
 * (discuss/015 · discuss/016).
 *
 * **문서에만 있고 코드에 없는 결정은 결정이 아니다**(규약 규칙 7). 강조색이
 * 문서에서 쑥으로 정해진 뒤 `index.css`는 먹색인 채로 남았고, 005에서 화면을
 * 판정하다 드러났다. 사람이 눈으로 대조하는 방식은 그때 이미 실패했다.
 *
 * **값을 여기 복사하지 않는다.** 015가 처음 만든 판은 기대값을 이 파일에 적어둬서
 * 검사하는 것이 "복사본끼리의 대비"였고, `index.css`를 되돌려도 초록이었다.
 * 지금은 문서와 코드를 **양쪽 다 파일에서 읽어** 맞춘다.
 *
 * **이름 목록도 두지 않는다.** 015는 강조 4개만 보는 목록을 들고 있었고, 그래서
 * 문서 표의 나머지가 아무에게도 안 보였다 — 그중 하나(`surface`)가 실제로 어긋나
 * 있었다(016). 지금은 **문서 표에서 읽은 이름 전부**를 본다. 문서에 토큰을 더하면
 * 자동으로 여기 들어온다.
 *
 * 관문 셋이다. 넣기만 하고 물려보지 않으면 있는 것과 일하는 것이 구분되지 않는다.
 *   1. 문서 표의 모든 토큰 ↔ `src/index.css`
 *   2. 공유 카드의 종이 색 ↔ 문서의 라이트 값
 *   3. 문서의 대비 표 ↔ 문서 자신의 토큰으로 다시 계산한 값
 */

/**
 * 세 파일을 그대로 읽는다.
 *
 * `?raw`를 먼저 썼는데 **CSS만 빈 문자열이 온다** — Vite의 CSS 플러그인이 먼저
 * 처리해서 `?raw`가 남지 않는다(`import.meta.glob`도 같다). 그래서 `node:fs`를
 * 쓰고, node 타입은 **이 파일에만** 연다. `tsconfig.app.json`의 `types`에 넣으면
 * 앱 코드도 node API를 쓸 수 있게 되는데 그건 브라우저에서 깨진다.
 */
const CSS = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const DOC = readFileSync(
  new URL("../../docs/DESIGN.md", import.meta.url),
  "utf8"
);
const CARD = readFileSync(
  new URL("../features/card/render.ts", import.meta.url),
  "utf8"
);

/**
 * 토큰 이름에 **숫자를 허용한다**. `[a-z-]+`로 두면 `text-2`·`text-3`이 양쪽에서
 * 조용히 빠진다 — 016이 이름을 11개로 센 것이 그래서이고 실제로는 13개다.
 * **목록을 없애도 정규식이 좁으면 같은 구멍이 남는다.**
 */
const NAME = "[a-z0-9-]+";

/** `:root { … }` / `.dark { … }` 안의 `--이름: 값;`을 읽는다. */
function cssTokens(selector: string): Map<string, string> {
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(CSS);
  if (!block)
    throw new Error(`index.css에서 ${selector} 블록을 찾지 못했습니다`);
  const out = new Map<string, string>();
  for (const m of block[1].matchAll(
    new RegExp(`--(${NAME}):\\s*([^;]+);`, "g")
  )) {
    out.set(m[1], m[2].trim().toLowerCase());
  }
  return out;
}

/**
 * `docs/DESIGN.md`에서 `| 이름 | #라이트 | #다크 | …` 행을 읽는다.
 * 표 모양이 바뀌면 이 테스트가 깨지는데, 그게 맞다 — 문서가 원본이다.
 */
function docTokens(): Map<string, { light: string; dark: string }> {
  const out = new Map<string, { light: string; dark: string }>();
  const row = new RegExp(
    `^\\|\\s*\`(${NAME})\`\\s*\\|\\s*\`(#[0-9a-f]{3,8})\`\\s*\\|\\s*\`(#[0-9a-f]{3,8})\`\\s*\\|`,
    "gim"
  );
  for (const m of DOC.matchAll(row)) {
    out.set(m[1], { light: m[2].toLowerCase(), dark: m[3].toLowerCase() });
  }
  return out;
}

/** `render.ts`의 `PAPER = { … }`를 읽는다. 키는 `text2`처럼 하이픈이 없다. */
function paperTokens(): Map<string, string> {
  const block = /const PAPER = \{([\s\S]*?)\n\};/.exec(CARD);
  if (!block) throw new Error("render.ts에서 PAPER를 찾지 못했습니다");
  const out = new Map<string, string>();
  for (const m of block[1].matchAll(/([a-z0-9]+):\s*"(#[0-9a-fA-F]{3,8})"/g)) {
    // `text2` → `text-2`. 문서의 이름으로 되돌린다.
    out.set(m[1].replace(/([a-z])(\d)/, "$1-$2"), m[2].toLowerCase());
  }
  return out;
}

const light = cssTokens(":root");
const dark = cssTokens("\\.dark");
const doc = docTokens();
const paper = paperTokens();

describe("관문 1 — 문서 표의 토큰이 index.css와 같은가", () => {
  it("문서와 코드 양쪽을 실제로 읽었다", () => {
    // 파싱이 조용히 실패하면 그 아래 시험이 전부 무의미해진다.
    expect(doc.size).toBeGreaterThanOrEqual(13);
    expect(light.size).toBeGreaterThan(10);
    expect(dark.size).toBeGreaterThan(5);
  });

  // **이름 목록을 두지 않는다.** 문서 표에 있는 것을 전부 본다.
  for (const [name, expected] of doc) {
    it(`\`${name}\``, () => {
      expect(light.get(name), `라이트 --${name}`).toBe(expected.light);
      expect(dark.get(name), `다크 --${name}`).toBe(expected.dark);
    });
  }
});

describe("관문 2 — 공유 카드의 종이 색이 문서의 라이트 값과 같은가", () => {
  // 카드는 남의 타임라인에 올라가는 종이라 **다크 모드를 일부러 안 따른다**
  // (`render.ts:5-10`). 떼어놓은 것은 다크 모드지 값이 아니므로 라이트 값은
  // 문서와 같아야 한다. 복사 자체는 없애지 않는다.
  it("PAPER를 읽었다", () => {
    expect(paper.size).toBeGreaterThanOrEqual(7);
  });

  for (const [name, hex] of paper) {
    it(`PAPER.${name}`, () => {
      const expected = doc.get(name);
      expect(expected, `docs/DESIGN.md 표에 ${name}이 없습니다`).toBeDefined();
      expect(hex).toBe(expected!.light);
    });
  }
});

function ratio(t: Map<string, string>, a: string, b: string): number {
  const x = t.get(a);
  const y = t.get(b);
  if (!x || !y) throw new Error(`토큰 --${a} 또는 --${b}이 없습니다`);
  return contrastRatio(x, y);
}

/**
 * 관문 3 — 문서의 대비 표가 문서 자신의 토큰으로 계산된 값인가.
 *
 * `강조 ↔ 카드면 7.32:1`이 실제로는 **코드의 `#ffffff`**로 나온 값이었고, 문서
 * 자신의 `surface`로는 7.13이다(016). 문서가 자기 표를 못 맞추고 있었다.
 *
 * 라벨 → 토큰 쌍 매핑은 여기 적는다. **값의 사본이 아니라 구조의 사본**이라
 * 토큰이 바뀌어도 따라 틀리지 않는다. 라벨이 바뀌면 "매핑에 없다"로 깨지는데,
 * 그때는 사람이 봐야 하는 것이 맞다.
 */
const 대비_라벨: Record<string, () => number[]> = {
  "강조 ↔ 캔버스(라이트)": () => [ratio(light, "accent", "canvas")],
  "강조 ↔ 카드면": () => [ratio(light, "accent", "surface")],
  "강조 ↔ 캔버스(다크)": () => [ratio(dark, "accent", "canvas")],
  "글자 ↔ 강조 (양쪽)": () => [
    ratio(light, "accent", "on-accent"),
    ratio(dark, "accent", "on-accent"),
  ],
  "흐린 배경 위 강조 글자": () => [
    ratio(light, "accent-soft", "on-accent-soft"),
  ],
};

describe("관문 3 — 문서의 대비 표가 문서 자신의 값과 맞는가", () => {
  // `↔`로 잡으면 "흐린 배경 위 강조 글자" 행이 빠진다. 그 행에는 `↔`가 없다.
  // 그래서 **구조**로 잡는다 — 값 칸이 비율이고 기준 칸이 `4.5:1`인 행.
  const rows = [
    ...DOC.matchAll(
      /^\|\s*([^|]+?)\s*\|\s*([\d.·]+)(?::1)?\s*\|\s*4\.5:1\s*\|/gm
    ),
  ];

  it("대비 표를 읽었다", () => {
    expect(rows.length).toBe(Object.keys(대비_라벨).length);
  });

  for (const row of rows) {
    const label = row[1].trim();
    it(`\`${label}\``, () => {
      const calc = 대비_라벨[label];
      expect(calc, `대비_라벨에 "${label}"이 없습니다`).toBeDefined();
      const written = row[2].split("·").map(Number);
      const actual = calc!();
      expect(written.length, `"${label}"의 값 개수`).toBe(actual.length);
      actual.forEach((v, i) => {
        // 문서는 소수 둘째 자리까지 적는다.
        expect(Number(v.toFixed(2)), `"${label}" ${i + 1}번째`).toBe(
          written[i]
        );
      });
    });
  }
});
