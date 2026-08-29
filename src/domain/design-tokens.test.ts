/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/domain/color";

/**
 * `docs/DESIGN.md`가 정한 토큰이 `src/index.css`에 실제로 들어갔는지 지킨다
 * (discuss/015).
 *
 * **문서에만 있고 코드에 없는 결정은 결정이 아니다**(규약 규칙 7). 강조색이
 * 문서에서 쑥으로 정해진 뒤 `index.css`는 먹색인 채로 남았고, 005에서 화면을
 * 판정하다 그것이 드러났다. 사람이 눈으로 대조하는 방식은 그때 이미 실패했다.
 *
 * **값을 여기 복사하지 않는다.** 처음에는 기대값을 이 파일에 적어뒀는데, 그러면
 * 검사하는 것이 "복사본끼리의 대비"라서 `index.css`를 되돌려도 초록으로 통과한다.
 * 015가 잡으려던 것이 사본 사이의 갈라짐인데 사본을 하나 더 만든 꼴이었다
 * (검증이 015에서 찾았다). 그래서 **문서와 코드 양쪽을 파일에서 읽어** 맞춘다.
 */

/**
 * 두 파일을 그대로 읽는다.
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

/** `:root { … }` / `.dark { … }` 안의 `--이름: 값;`을 읽는다. */
function cssTokens(selector: string): Map<string, string> {
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(CSS);
  if (!block)
    throw new Error(`index.css에서 ${selector} 블록을 찾지 못했습니다`);
  const out = new Map<string, string>();
  for (const m of block[1].matchAll(/--([a-z-]+):\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim().toLowerCase());
  }
  return out;
}

/**
 * `docs/DESIGN.md` §2의 표에서 `| `이름` | `라이트` | `다크` | …` 줄을 읽는다.
 * 표 모양이 바뀌면 이 테스트가 깨지는데, 그게 맞다 — 문서가 원본이다.
 */
function docTokens(): Map<string, { light: string; dark: string }> {
  const out = new Map<string, { light: string; dark: string }>();
  const row =
    /^\|\s*`([a-z-]+)`\s*\|\s*`(#[0-9a-f]{3,8})`\s*\|\s*`(#[0-9a-f]{3,8})`\s*\|/gim;
  for (const m of DOC.matchAll(row)) {
    out.set(m[1], { light: m[2].toLowerCase(), dark: m[3].toLowerCase() });
  }
  return out;
}

const light = cssTokens(":root");
const dark = cssTokens("\\.dark");
const doc = docTokens();

/**
 * 015가 맞춘 토큰. 여기 이름을 더하면 그 토큰도 문서와 대조된다.
 *
 * `surface`(라이트)가 지금 어긋나 있다 — 문서 `#fdfcfa`, 코드 `#ffffff`.
 * 015의 범위는 강조 토큰이라 손대지 않았고, 검증이 015에 적어뒀다. 그 작업이
 * 열릴 때 이 배열에 이름 하나만 더하면 된다.
 */
const 대조할_토큰 = ["accent", "on-accent", "accent-soft", "on-accent-soft"];

describe("토큰이 docs/DESIGN.md와 같은가", () => {
  it("문서와 코드 양쪽을 실제로 읽었다", () => {
    // 파싱이 조용히 실패하면 그 아래 시험이 전부 무의미해진다.
    expect(doc.size).toBeGreaterThan(10);
    expect(light.size).toBeGreaterThan(10);
    expect(dark.size).toBeGreaterThan(5);
  });

  for (const name of 대조할_토큰) {
    it(`\`${name}\`이 문서와 같다`, () => {
      const expected = doc.get(name);
      expect(
        expected,
        `docs/DESIGN.md 표에 \`${name}\`이 없습니다`
      ).toBeDefined();
      expect(light.get(name), `라이트 --${name}`).toBe(expected!.light);
      expect(dark.get(name), `다크 --${name}`).toBe(expected!.dark);
    });
  }
});

/** WCAG AA 본문 기준. 알약·버튼의 글자가 여기 걸린다. */
const AA = 4.5;

describe("강조 토큰의 대비", () => {
  for (const [theme, t] of [
    ["라이트", light],
    ["다크", dark],
  ] as const) {
    describe(theme, () => {
      const v = (n: string) => {
        const hex = t.get(n);
        if (!hex) throw new Error(`--${n}이 없습니다`);
        return hex;
      };

      it(`강조 위의 글자가 ${AA}:1 이상이다`, () => {
        expect(
          contrastRatio(v("accent"), v("on-accent"))
        ).toBeGreaterThanOrEqual(AA);
      });

      it(`흐린 강조 위의 글자가 ${AA}:1 이상이다`, () => {
        expect(
          contrastRatio(v("accent-soft"), v("on-accent-soft"))
        ).toBeGreaterThanOrEqual(AA);
      });

      it(`강조가 캔버스에서 ${AA}:1 이상 떨어진다`, () => {
        // 강조는 버튼 배경으로 쓰이므로 바탕에서 충분히 떠야 한다.
        expect(contrastRatio(v("accent"), v("canvas"))).toBeGreaterThanOrEqual(
          AA
        );
      });

      it(`강조가 카드면에서 ${AA}:1 이상 떨어진다`, () => {
        expect(contrastRatio(v("accent"), v("surface"))).toBeGreaterThanOrEqual(
          AA
        );
      });

      // `흐린 강조 ↔ 카드면`을 1~2로 묶었던 시험은 뺐다. 검증이 재보니 흐린 강조를
      // 진하게 밀 때 **4.5:1 시험이 언제나 먼저 걸린다** — `on-accent-soft`가 강조색
      // 자신이라, 흐린 강조가 카드면에서 멀어지면 그만큼 글자에 가까워진다. 두
      // 시험이 같은 축을 반대에서 보고 있었고 이쪽은 한 번도 먼저 걸리지 않았다.
    });
  }
});
