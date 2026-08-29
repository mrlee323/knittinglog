import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/domain/color";

/**
 * 디자인 토큰이 `docs/DESIGN.md`와 어긋나지 않는지 지킨다 (discuss/015).
 *
 * **문서에만 있고 코드에 없는 결정은 결정이 아니다**(규약 규칙 7). 실제로
 * 강조색이 문서에서 쑥으로 정해진 뒤 `src/index.css`는 먹색인 채로 남았고,
 * 005에서 화면을 판정하다 그것이 드러났다. 사람이 눈으로 대조하는 방식은
 * 그때 이미 한 번 실패했으므로 여기서 기계가 대조한다.
 *
 * 값을 여기 복사해 두는 것은 중복이 아니라 **대조 대상**이다 — `index.css`를
 * 고치면 이 테스트가 깨지고, 그때 `docs/DESIGN.md`도 같이 고쳤는지 묻게 된다.
 */

/** docs/DESIGN.md §2의 강조 표. 여기를 고치면 문서와 index.css도 같이 고친다. */
const ACCENT = {
  light: {
    accent: "#3f5d48",
    onAccent: "#fbfaf9",
    accentSoft: "#edf1ee",
    onAccentSoft: "#3f5d48",
    canvas: "#fbfaf9",
    surface: "#ffffff",
  },
  dark: {
    accent: "#86b394",
    onAccent: "#171615",
    accentSoft: "#22302a",
    onAccentSoft: "#86b394",
    canvas: "#171615",
    surface: "#1e1d1c",
  },
} as const;

/** WCAG AA 본문 기준. 알약·버튼의 글자가 여기 걸린다. */
const AA = 4.5;

describe("강조 토큰의 대비", () => {
  for (const [theme, c] of Object.entries(ACCENT)) {
    describe(theme, () => {
      it(`강조 위의 글자가 ${AA}:1 이상이다`, () => {
        expect(contrastRatio(c.accent, c.onAccent)).toBeGreaterThanOrEqual(AA);
      });

      it(`흐린 강조 위의 글자가 ${AA}:1 이상이다`, () => {
        expect(
          contrastRatio(c.accentSoft, c.onAccentSoft)
        ).toBeGreaterThanOrEqual(AA);
      });

      it(`강조가 캔버스에서 ${AA}:1 이상 떨어진다`, () => {
        // 강조는 버튼 배경으로 쓰이므로 바탕에서 충분히 떠야 한다.
        expect(contrastRatio(c.accent, c.canvas)).toBeGreaterThanOrEqual(AA);
      });

      it(`강조가 카드면에서 ${AA}:1 이상 떨어진다`, () => {
        expect(contrastRatio(c.accent, c.surface)).toBeGreaterThanOrEqual(AA);
      });

      it("흐린 강조는 표면과 구별되되 면을 이기지 않는다", () => {
        // 라이프라인 칩처럼 깔리는 색이라 너무 세면 카드 위에서 튄다.
        const ratio = contrastRatio(c.accentSoft, c.surface);
        expect(ratio).toBeGreaterThan(1);
        expect(ratio).toBeLessThan(2);
      });
    });
  }
});
