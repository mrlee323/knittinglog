import { describe, expect, it } from "vitest";
import { cardFileName, coverRect, wrapText } from "./card";

/**
 * 글자 폭을 흉내내는 측정 함수.
 *
 * 한글은 라틴 글자보다 넓다 — 실제 서체의 비율에 가까워야 줄바꿈 테스트가
 * 의미를 갖는다. 공백은 좁게 둔다.
 */
const measure = (text: string) =>
  Array.from(text).reduce((sum, char) => {
    if (/\s/.test(char)) return sum + 0.5;
    return sum + (/[가-힯]/.test(char) ? 2 : 1);
  }, 0);

describe("줄바꿈", () => {
  it("폭에 들어가면 한 줄이다", () => {
    expect(wrapText("겉뜨기", 20, measure)).toEqual(["겉뜨기"]);
  });

  it("영문은 단어를 지킨다", () => {
    // 단어 중간에서 끊으면 실 이름이나 약어를 알아볼 수 없다
    expect(wrapText("slip slip knit twice", 10, measure)).toEqual([
      "slip slip",
      "knit twice",
    ]);
  });

  it("한글은 글자마다 끊는다 — 공백이 없어서 단어 단위로는 끊을 수 없다", () => {
    // 폭 8이면 한글 4자
    expect(wrapText("래글런소매눈송이요크", 8, measure)).toEqual([
      "래글런소",
      "매눈송이",
      "요크",
    ]);
  });

  it("한글과 영문이 섞이면 각자의 규칙을 따른다", () => {
    const lines = wrapText("눈송이 fair isle 요크", 10, measure);
    // 영문 단어는 쪼개지지 않는다
    expect(lines.join("|")).not.toMatch(/fai\||\|r isle/);
    expect(lines.every((l) => measure(l) <= 10 || Array.from(l).length === 1)).toBe(
      true
    );
  });

  it("줄 시작에 공백을 남기지 않는다 — 들여쓴 것처럼 보인다", () => {
    for (const line of wrapText("aaa bbb ccc ddd", 7, measure)) {
      expect(line).toBe(line.trimStart());
      expect(line).toBe(line.trimEnd());
    }
  });

  it("줄바꿈 문자를 지킨다", () => {
    expect(wrapText("첫줄\n둘째줄", 20, measure)).toEqual(["첫줄", "둘째줄"]);
  });

  it("빈 줄도 한 줄로 남는다 — 문단 사이 간격이 사라지면 안 된다", () => {
    expect(wrapText("가\n\n나", 20, measure)).toEqual(["가", "", "나"]);
  });

  it("가운뎃점으로 줄이 시작하지 않는다 — 글머리표처럼 보인다", () => {
    // 범례를 "겉뜨기 · 바늘비우기 · …"로 이어 적으므로 실제로 만나는 상황이다
    const legend = "겉뜨기 · 바늘비우기 · 왼코모아 · 오른코모아 · 중심모아";
    for (const line of wrapText(legend, 14, measure)) {
      expect(line.startsWith("·")).toBe(false);
    }
  });

  it("닫는 괄호로 줄이 시작하지 않는다", () => {
    const text = "왼코 모아뜨기 (2코 줄임) 다음 단";
    for (const line of wrapText(text, 10, measure)) {
      expect(line.startsWith(")")).toBe(false);
    }
  });

  it("금칙 글자가 문장 맨 앞이면 그대로 둔다", () => {
    // 붙일 앞 조각이 없다 — 지워버리면 글이 바뀐다
    expect(wrapText("…계속", 20, measure).join("")).toContain("…");
  });

  it("한 조각이 혼자 폭을 넘으면 그 줄은 넘친 채로 둔다", () => {
    // 아주 긴 주소나 실 이름을 글자 단위로 자르면 알아볼 수 없게 된다
    expect(wrapText("supercalifragilistic", 5, measure)).toEqual([
      "supercalifragilistic",
    ]);
  });

  it("줄 수를 넘기면 마지막 줄에 줄임표를 붙인다", () => {
    const lines = wrapText("래글런소매눈송이요크가디건", 8, measure, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/…$/);
    expect(measure(lines[1])).toBeLessThanOrEqual(8);
  });

  it("줄 수 안에 들어가면 줄임표를 붙이지 않는다", () => {
    expect(wrapText("겉뜨기", 20, measure, 3)).toEqual(["겉뜨기"]);
  });

  it("줄임표를 붙이려고 글자를 지워도 폭을 넘지 않는다", () => {
    const lines = wrapText("가나다라마바사아자차카타파하", 4, measure, 1);
    expect(measure(lines[0])).toBeLessThanOrEqual(4);
    expect(lines[0]).toMatch(/…$/);
  });
});

describe("사진 자르기", () => {
  it("원본이 더 넓으면 좌우를 잘라낸다", () => {
    // 4000×2000을 1:1 자리에 넣으면 가로 2000만 쓴다
    expect(coverRect(4000, 2000, 500, 500)).toEqual({
      x: 1000,
      y: 0,
      width: 2000,
      height: 2000,
    });
  });

  it("원본이 더 높으면 위아래를 잘라낸다", () => {
    expect(coverRect(2000, 4000, 500, 500)).toEqual({
      x: 0,
      y: 1000,
      width: 2000,
      height: 2000,
    });
  });

  it("비율이 같으면 원본 전체를 쓴다", () => {
    expect(coverRect(1200, 900, 400, 300)).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 900,
    });
  });

  it("잘라낸 영역의 비율이 자리의 비율과 같다 — 늘어나면 게이지가 거짓이 된다", () => {
    const box = { w: 1080, h: 810 };
    for (const [sw, sh] of [
      [4000, 3000],
      [1000, 3000],
      [3000, 1000],
      [1080, 810],
    ]) {
      const r = coverRect(sw, sh, box.w, box.h);
      expect(r.width / r.height).toBeCloseTo(box.w / box.h, 5);
    }
  });

  it("잘라낸 영역이 원본을 벗어나지 않는다", () => {
    for (const [sw, sh] of [
      [4000, 3000],
      [1000, 3000],
    ]) {
      const r = coverRect(sw, sh, 500, 500);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(sw + 0.001);
      expect(r.y + r.height).toBeLessThanOrEqual(sh + 0.001);
    }
  });

  it("크기가 0이면 계산하지 않는다", () => {
    expect(coverRect(0, 0, 500, 500)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe("파일 이름", () => {
  const day = new Date(2026, 7, 19);

  it("제목과 날짜로 만든다", () => {
    expect(cardFileName("눈송이 요크", day)).toBe("눈송이 요크 20260819.png");
  });

  it("한글을 그대로 둔다 — 로마자로 바꾸면 자기 작품을 못 찾는다", () => {
    expect(cardFileName("케이블 목도리", day)).toContain("케이블 목도리");
  });

  it("파일 이름에 못 쓰는 글자를 뺀다", () => {
    expect(cardFileName('소매 3/4 "긴" 것 <시험>', day)).toBe(
      "소매 3 4 긴 것 시험 20260819.png"
    );
  });

  it("아주 긴 제목을 자른다", () => {
    const name = cardFileName("가".repeat(200), day);
    expect(name.length).toBeLessThan(60);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("제목이 비어도 이름이 나온다", () => {
    expect(cardFileName("   ", day)).toBe("knittinglog 20260819.png");
  });
});
