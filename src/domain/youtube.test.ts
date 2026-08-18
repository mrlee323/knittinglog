import { describe, expect, it } from "vitest";
import { embedUrl, parseYouTube, thumbnailUrl, watchUrl } from "./youtube";

describe("parseYouTube", () => {
  const id = "dQw4w9WgXcQ";

  it("watch 링크에서 id를 뽑는다", () => {
    expect(parseYouTube(`https://www.youtube.com/watch?v=${id}`)?.videoId).toBe(
      id
    );
  });

  it("공유용 단축 링크를 읽는다", () => {
    expect(parseYouTube(`https://youtu.be/${id}`)?.videoId).toBe(id);
  });

  it("쇼츠·임베드·라이브 경로를 읽는다", () => {
    for (const path of ["shorts", "embed", "live", "v"]) {
      expect(
        parseYouTube(`https://www.youtube.com/${path}/${id}`)?.videoId
      ).toBe(id);
    }
  });

  it("프로토콜이 없어도 받는다 — 붙여넣기에서 가장 흔한 형태다", () => {
    expect(parseYouTube(`youtube.com/watch?v=${id}`)?.videoId).toBe(id);
  });

  it("앞뒤 공백을 버린다", () => {
    expect(parseYouTube(`  https://youtu.be/${id}  `)?.videoId).toBe(id);
  });

  it("모바일·뮤직 도메인도 같은 영상으로 본다", () => {
    expect(parseYouTube(`https://m.youtube.com/watch?v=${id}`)?.videoId).toBe(
      id
    );
    expect(
      parseYouTube(`https://music.youtube.com/watch?v=${id}`)?.videoId
    ).toBe(id);
  });

  it("시작 지점을 초로 바꾼다", () => {
    expect(parseYouTube(`https://youtu.be/${id}?t=90`)?.startSeconds).toBe(90);
    expect(parseYouTube(`https://youtu.be/${id}?t=1m30s`)?.startSeconds).toBe(
      90
    );
    expect(parseYouTube(`https://youtu.be/${id}?t=1h2m3s`)?.startSeconds).toBe(
      3723
    );
    expect(
      parseYouTube(`https://www.youtube.com/watch?v=${id}&start=45`)
        ?.startSeconds
    ).toBe(45);
  });

  it("해석할 수 없는 시작 지점은 버리고 영상은 살린다", () => {
    const ref = parseYouTube(`https://youtu.be/${id}?t=나중에`);
    expect(ref?.videoId).toBe(id);
    expect(ref?.startSeconds).toBeUndefined();
  });

  it("유튜브가 아니거나 id가 아니면 null", () => {
    expect(parseYouTube("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTube("https://www.youtube.com/watch?v=tooshort")).toBeNull();
    expect(
      parseYouTube("https://www.youtube.com/results?search_query=knit")
    ).toBeNull();
    expect(parseYouTube("")).toBeNull();
    expect(parseYouTube("그냥 메모")).toBeNull();
  });
});

describe("주소 만들기", () => {
  const ref = { videoId: "dQw4w9WgXcQ", startSeconds: 90 };

  it("임베드는 nocookie 도메인을 쓴다", () => {
    expect(embedUrl(ref)).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("시작 지점과 자동재생을 붙인다", () => {
    expect(embedUrl(ref, true)).toContain("start=90");
    expect(embedUrl(ref, true)).toContain("autoplay=1");
    // 재생을 누르기 전에는 자동재생을 붙이지 않는다
    expect(embedUrl(ref)).not.toContain("autoplay");
  });

  it("썸네일은 모든 영상에 있는 크기를 쓴다", () => {
    expect(thumbnailUrl(ref.videoId)).toContain("hqdefault.jpg");
  });

  it("원본 주소는 시작 지점을 유지한다", () => {
    expect(watchUrl(ref)).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90"
    );
  });
});
