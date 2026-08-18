import { describe, expect, it } from "vitest";
import {
  embedUrl,
  parseYouTube,
  playerMessage,
  playerStateFrom,
  thumbnailUrl,
  watchUrl,
} from "./youtube";

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
    expect(embedUrl(ref, { autoplay: true })).toContain("start=90");
    expect(embedUrl(ref, { autoplay: true })).toContain("autoplay=1");
    // 재생을 누르기 전에는 자동재생을 붙이지 않는다
    expect(embedUrl(ref)).not.toContain("autoplay");
  });

  it("API를 켜면 부모 출처를 함께 붙인다", () => {
    const url = embedUrl(ref, { jsApi: true, origin: "https://example.com" });
    expect(url).toContain("enablejsapi=1");
    expect(url).toContain("origin=https%3A%2F%2Fexample.com");
    // 켜지 않으면 붙지 않는다 — 필요 없는 파라미터를 남기지 않는다
    expect(embedUrl(ref)).not.toContain("enablejsapi");
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

describe("플레이어 제어", () => {
  it("명령은 유튜브가 요구하는 문자열 형식이다", () => {
    expect(JSON.parse(playerMessage("pauseVideo"))).toEqual({
      event: "command",
      func: "pauseVideo",
      args: [],
    });
  });

  it("상태 메시지를 재생·일시정지로 읽는다", () => {
    // 플레이어는 문자열로도, 객체로도, info 안에 감싸서도 보낸다
    expect(
      playerStateFrom(JSON.stringify({ event: "infoDelivery", info: 1 }))
    ).toBe("playing");
    expect(playerStateFrom({ info: 2 })).toBe("paused");
    expect(playerStateFrom({ info: { playerState: 1 } })).toBe("playing");
    // 끝난 것도 멈춘 상태로 본다 — 버튼이 "다시 재생"을 가리켜야 한다
    expect(playerStateFrom({ info: 0 })).toBe("paused");
  });

  it("관계없는 메시지는 무시한다", () => {
    expect(playerStateFrom("not json")).toBeNull();
    expect(playerStateFrom({ info: 3 })).toBeNull();
    expect(playerStateFrom(null)).toBeNull();
  });
});
