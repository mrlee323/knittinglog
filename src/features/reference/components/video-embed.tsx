import { useEffect, useRef, useState } from "react";
import { ExternalLink, Pause, Play, X } from "lucide-react";
import {
  embedUrl,
  playerHandshake,
  playerMessage,
  playerStateFrom,
  PLAYER_ORIGIN,
  thumbnailUrl,
  watchUrl,
  type PlayerCommand,
  type YouTubeRef,
} from "@/domain/youtube";
import { useStrings } from "@/i18n";

/**
 * 앱 안에서 도안 영상 재생.
 *
 * iframe을 처음부터 심지 않는다. 참고 자료가 다섯 개 붙은 프로젝트를 열 때마다
 * 유튜브 플레이어 다섯 개가 로드되면 느려지고, 보지도 않은 영상에 추적이 붙는다.
 * 그래서 썸네일을 먼저 놓고 재생을 누른 뒤에 iframe을 만든다.
 *
 * 재생 중 조작은 **우리 버튼으로 한다**. 유튜브 자체 컨트롤은 iframe 안에 있어서
 * 우리가 손댈 수 없고, 터치 기기에서는 첫 탭이 컨트롤을 띄우는 데 쓰여 "눌렀는데
 * 안 멈춘다"로 느껴진다. IFrame API로 일시정지·재생 명령을 직접 보내고, 플레이어가
 * 알려주는 상태로 버튼 모양을 맞춘다.
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
      <Player video={video} title={title} onClose={() => setPlaying(false)} />
    );
  }

  return (
    <div>
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

      {/* 재생 중과 같은 자리에 같은 링크를 둔다. 상태가 바뀌어도 구성이
          같아야 눈이 다시 찾지 않는다. */}
      <div className="mt-1.5">
        <WatchOnYouTube video={video} />
      </div>
    </div>
  );
}

function Player({
  video,
  title,
  onClose,
}: {
  video: YouTubeRef;
  title?: string;
  onClose: () => void;
}) {
  const t = useStrings();
  const frame = useRef<HTMLIFrameElement>(null);
  // 자동재생으로 시작하므로 재생 중으로 둔다. 이후에는 플레이어가 알려주는
  // 상태를 따라간다 — 유튜브 컨트롤로 멈춰도 우리 버튼이 어긋나지 않는다.
  const [state, setState] = useState<"playing" | "paused">("playing");

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // 출처를 확인하지 않으면 아무 창이나 우리 버튼 모양을 바꿀 수 있다
      if (event.origin !== PLAYER_ORIGIN) return;
      const next = playerStateFrom(event.data);
      if (next) setState(next);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const send = (func: PlayerCommand) => {
    frame.current?.contentWindow?.postMessage(
      playerMessage(func),
      PLAYER_ORIGIN
    );
  };

  const toggle = () => {
    const next = state === "playing" ? "paused" : "playing";
    send(next === "paused" ? "pauseVideo" : "playVideo");
    // 명령을 보낸 즉시 버튼을 바꾼다. 플레이어 응답을 기다리면 눌렀는데
    // 반응이 없는 순간이 생기고, 그게 이 기능의 원래 문제였다.
    setState(next);
  };

  return (
    <div className="relative">
      <iframe
        ref={frame}
        src={embedUrl(video, {
          autoplay: true,
          jsApi: true,
          origin: window.location.origin,
        })}
        title={title ?? t.reference.video}
        // 전체화면은 태블릿에서 도안 영상을 볼 때 실제로 쓰인다.
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        // 플레이어가 상태를 보내주려면 먼저 인사를 해야 한다
        onLoad={() =>
          frame.current?.contentWindow?.postMessage(
            playerHandshake(),
            PLAYER_ORIGIN
          )
        }
        className="border-line aspect-video w-full rounded-md border"
      />

      {/* 조작은 영상 위가 아니라 아래 줄에 둔다. 영상 위에 겹치면 유튜브
          컨트롤과 겹쳐 어느 것을 누르는지 알 수 없다. */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={
            state === "playing" ? t.reference.pause : t.reference.resume
          }
          className="bg-sunken text-text text-small inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 font-medium transition hover:brightness-95"
        >
          {state === "playing" ? (
            <Pause size={15} fill="currentColor" aria-hidden />
          ) : (
            <Play size={15} fill="currentColor" aria-hidden />
          )}
          {state === "playing" ? t.reference.pause : t.reference.resume}
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.reference.stop}
          className="text-text-2 hover:text-text text-caption inline-flex min-h-11 items-center gap-1 rounded-md px-2 transition"
        >
          <X size={14} aria-hidden />
          {t.reference.stop}
        </button>

        <span className="ml-auto">
          <WatchOnYouTube video={video} />
        </span>
      </div>
    </div>
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
