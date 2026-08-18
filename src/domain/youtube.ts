/**
 * YouTube 링크 해석.
 *
 * 도안 영상·튜토리얼은 뜨개 학습의 절반이고, 사용자가 붙여넣는 주소는 형태가
 * 제각각이다(공유 버튼, 앱, 검색 결과, 라이브, 쇼츠). 그걸 재생 가능한 형태로
 * 바꾸는 건 순수 문자열 처리라 여기서 처리하고 테스트한다.
 *
 * 재생은 youtube-nocookie.com 임베드로 한다. 프로젝트에 붙여둔 영상 목록을
 * 여는 것만으로 광고 추적이 붙을 이유가 없다.
 */

export interface YouTubeRef {
  videoId: string;
  /** 시작 지점(초). 공유 링크의 t·start 값. */
  startSeconds?: number;
}

/** 영상 id는 11자 고정이고 URL 안전 문자만 쓴다 */
const VIDEO_ID = /^[\w-]{11}$/;

/**
 * `1h2m3s`·`90s`·`90` 형태를 초로 바꾼다.
 *
 * 유튜브는 세 형태를 모두 쓴다. 해석에 실패하면 시작 지점만 버리고 영상은
 * 재생한다 — 링크 하나를 통째로 거부하는 것보다 낫다.
 */
function parseStart(raw: string | null): number | undefined {
  if (!raw) return undefined;

  const plain = Number(raw);
  if (Number.isFinite(plain) && plain >= 0) return Math.floor(plain);

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw.trim());
  if (!match || !match.slice(1).some(Boolean)) return undefined;

  const [h, m, s] = match.slice(1).map((v) => Number(v ?? 0) || 0);
  return h * 3600 + m * 60 + s;
}

/**
 * 붙여넣은 주소에서 영상 id를 뽑는다. 유튜브 링크가 아니면 null.
 *
 * 지원 형태: watch?v=, youtu.be/, /embed/, /shorts/, /live/, /v/.
 * 앞뒤 공백과 프로토콜 누락(www.youtube.com/…)을 허용한다 — 붙여넣기에서
 * 가장 흔한 두 가지다.
 */
export function parseYouTube(input: string): YouTubeRef | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const start = parseStart(
    url.searchParams.get("t") ?? url.searchParams.get("start")
  );

  const from = (id: string | undefined): YouTubeRef | null =>
    id && VIDEO_ID.test(id) ? { videoId: id, startSeconds: start } : null;

  if (host === "youtu.be") return from(url.pathname.slice(1).split("/")[0]);

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch")
      return from(url.searchParams.get("v") ?? undefined);

    const [, segment, id] = url.pathname.split("/");
    if (
      segment === "embed" ||
      segment === "shorts" ||
      segment === "live" ||
      segment === "v"
    ) {
      return from(id);
    }
  }

  return null;
}

/** 재생용 임베드 주소. 자동재생은 사용자가 재생을 누른 뒤에만 붙인다. */
export function embedUrl(ref: YouTubeRef, autoplay = false): string {
  const params = new URLSearchParams();
  if (ref.startSeconds) params.set("start", String(ref.startSeconds));
  if (autoplay) params.set("autoplay", "1");
  // 관련 영상을 이 채널로 제한한다. 뜨개 영상을 보다가 추천으로 빠지는 걸 줄인다.
  params.set("rel", "0");

  const query = params.toString();
  return `https://www.youtube-nocookie.com/embed/${ref.videoId}${query ? `?${query}` : ""}`;
}

/**
 * 썸네일 주소.
 *
 * hqdefault는 모든 영상에 존재한다. maxres는 없는 영상이 있어서 깨진 이미지가
 * 나온다 — 목록에서 그건 링크가 잘못된 것처럼 보인다.
 */
export const thumbnailUrl = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/** 원본 유튜브 주소. 앱 밖에서 열거나 공유할 때 쓴다. */
export const watchUrl = (ref: YouTubeRef) =>
  `https://www.youtube.com/watch?v=${ref.videoId}${
    ref.startSeconds ? `&t=${ref.startSeconds}` : ""
  }`;
