import { describe, expect, it } from "vitest";
import { extractUrl, isEmptyDraft, parseShared, sourceHost } from "./shared";

describe("주소 찾아내기", () => {
  it("글자 속에서 주소를 꺼낸다", () => {
    expect(extractUrl("이 무늬 예쁘다 https://pin.it/abc123")).toBe(
      "https://pin.it/abc123"
    );
  });

  it("뒤에 붙은 문장부호는 주소에서 뺀다", () => {
    // "한번 봐 https://a.com." 같은 공유가 실제로 온다
    expect(extractUrl("봐봐 https://example.com/pin.")).toBe(
      "https://example.com/pin"
    );
    expect(extractUrl("(https://example.com/a)")).toBe("https://example.com/a");
  });

  it("첫 주소만 쓴다", () => {
    expect(extractUrl("https://a.com 그리고 https://b.com")).toBe(
      "https://a.com"
    );
  });

  it("http도 받는다", () => {
    expect(extractUrl("http://example.com")).toBe("http://example.com");
  });

  it("주소가 없으면 undefined", () => {
    expect(extractUrl("그냥 메모")).toBeUndefined();
    expect(extractUrl("")).toBeUndefined();
    expect(extractUrl(null)).toBeUndefined();
  });
});

describe("공유 payload 정리", () => {
  it("url 칸을 제대로 채워 보내면 그대로 쓴다", () => {
    expect(
      parseShared({
        title: "눈송이 무늬",
        text: "요크에 쓰고 싶다",
        url: "https://pin.it/a",
      })
    ).toEqual({
      url: "https://pin.it/a",
      title: "눈송이 무늬",
      note: "요크에 쓰고 싶다",
    });
  });

  it("url을 비우고 text에 함께 담아 보내도 찾아낸다", () => {
    // 안드로이드 공유에서 흔한 형태다
    expect(parseShared({ text: "눈송이 무늬 https://pin.it/a" })).toEqual({
      url: "https://pin.it/a",
      note: "눈송이 무늬",
    });
  });

  it("title에 주소를 담아 보내도 찾아낸다", () => {
    expect(parseShared({ title: "https://pin.it/a" })).toEqual({
      url: "https://pin.it/a",
    });
  });

  it("주소를 뺀 나머지만 글로 남는다 — 카드에 주소가 두 번 보이지 않게", () => {
    const draft = parseShared({ text: "https://pin.it/a 이거 좋다" });
    expect(draft.note).toBe("이거 좋다");
    expect(draft.note).not.toContain("https");
  });

  it("제목과 메모가 같으면 하나만 남긴다", () => {
    const draft = parseShared({
      title: "눈송이",
      text: "눈송이",
      url: "https://a.com",
    });
    expect(draft.title).toBe("눈송이");
    expect(draft.note).toBeUndefined();
  });

  it("주소 없이 글만 공유해도 메모로 남는다", () => {
    expect(parseShared({ text: "다음엔 래글런으로" })).toEqual({
      note: "다음엔 래글런으로",
    });
  });

  it("빈 payload는 저장할 것이 없다", () => {
    expect(isEmptyDraft(parseShared({}))).toBe(true);
    expect(isEmptyDraft(parseShared({ title: "  ", text: "" }))).toBe(true);
  });

  it("주소만 있어도 저장할 것이 있다", () => {
    expect(isEmptyDraft(parseShared({ url: "https://a.com" }))).toBe(false);
  });

  it("여러 줄 공유의 줄바꿈을 정리한다", () => {
    const draft = parseShared({ text: "첫 줄\n\n둘째 줄  https://a.com" });
    expect(draft.note).toBe("첫 줄 둘째 줄");
  });
});

describe("출처", () => {
  it("호스트만 짧게 보여준다", () => {
    expect(sourceHost("https://www.pinterest.com/pin/123")).toBe(
      "pinterest.com"
    );
    expect(sourceHost("https://pin.it/abc")).toBe("pin.it");
  });

  it("주소가 아니면 출처를 말하지 않는다 — 틀린 출처보다 없는 게 낫다", () => {
    expect(sourceHost("그냥 글")).toBeUndefined();
    expect(sourceHost(undefined)).toBeUndefined();
  });
});
