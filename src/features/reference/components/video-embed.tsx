import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { embedUrl, thumbnailUrl, watchUrl } from "@/domain/youtube";
import { useStrings } from "@/i18n";
import type { YouTubeRef } from "@/domain/youtube";

/**
 * 앱 안에서 도안 영상 재생.
 *
 * iframe을 처음부터 심지 않는다. 참고 자료가 다섯 개 붙은 프로젝트를 열 때마다
 * 유튜브 플레이어 다섯 개가 로드되면 느려지고, 보지도 않은 영상에 추적이 붙는다.
 * 그래서 썸네일을 먼저 놓고 재생을 누른 뒤에 iframe을 만든다.
 *
 * 재생은 youtube-nocookie.com으로 한다(domain/youtube.ts).
 */
export function VideoEmbed({
  video,
  title,
}: {
  video: YouTubeRef;
  title?: string;
}) {
  const t = useStrings();
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  if (playing) {
    return (
      <iframe
        src={embedUrl(video, true)}
        title={title ?? t.reference.video}
        // 전체화면은 태블릿에서 도안 영상을 볼 때 실제로 쓰인다.
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="border-line aspect-video w-full rounded-md border"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={t.reference.play}
      className="border-line bg-sunken group relative block aspect-video w-full overflow-hidden rounded-md border"
    >
      {/* 썸네일도 네트워크가 필요하다. 오프라인에서는 못 받으므로 그때는
          영상 자리를 비워두는 대신 재생 버튼만 남긴다 — 앱이 고장난 것처럼
          보이지 않게 하려는 것이고, 실제로 오프라인에서는 재생도 안 된다. */}
      {!thumbFailed && (
        <img
          src={thumbnailUrl(video.videoId)}
          alt=""
          loading="lazy"
          onError={() => setThumbFailed(true)}
          className="size-full object-cover"
        />
      )}

      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/55 p-4 text-white transition group-hover:bg-black/70">
          <Play size={22} fill="currentColor" aria-hidden />
        </span>
      </span>

      {thumbFailed && (
        <span className="text-text-3 text-caption absolute inset-x-0 bottom-2 text-center">
          {t.reference.offline}
        </span>
      )}
    </button>
  );
}

/** 앱 밖에서 열기. 유튜브 앱·다른 탭에서 보고 싶을 때가 있다. */
export function WatchOnYouTube({ video }: { video: YouTubeRef }) {
  const t = useStrings();
  return (
    <a
      href={watchUrl(video)}
      target="_blank"
      rel="noreferrer noopener"
      className="text-text-2 text-caption hover:text-text inline-flex min-h-11 items-center gap-1"
    >
      <ExternalLink size={13} aria-hidden />
      {t.reference.openExternal}
    </a>
  );
}
