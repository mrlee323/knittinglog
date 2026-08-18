import { useState } from "react";
import { Maximize2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/features/photo/components/photo-image";
import {
  VideoEmbed,
  WatchOnYouTube,
} from "@/features/reference/components/video-embed";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ViewerItem } from "@/features/reference/items";
import type { ProjectPhoto } from "@/types/entities";

/** 작업대와 뜨기 모드가 같은 뷰어를 쓴다 */
export function ItemViewer({
  item,
  maxHeight = "70vh",
}: {
  item?: ViewerItem;
  /** 뜨기 모드처럼 높이가 정해진 자리에서는 100%를 준다 */
  maxHeight?: string;
}) {
  const t = useStrings();

  if (!item) {
    return (
      <div className="text-text-3 text-caption flex h-full min-h-40 items-center justify-center px-4 text-center">
        {t.workbench.pickItem}
      </div>
    );
  }

  if (item.kind === "video" && item.video) {
    return (
      <div className="p-2">
        <VideoEmbed video={item.video} title={item.title} />
        <div className="mt-1.5">
          {item.title && <p className="text-small font-medium">{item.title}</p>}
          {item.note && (
            <p className="text-text-2 text-caption whitespace-pre-wrap">
              {item.note}
            </p>
          )}
          <WatchOnYouTube video={item.video} />
        </div>
      </div>
    );
  }

  return item.photo ? (
    <ImageStage photo={item.photo} maxHeight={maxHeight} />
  ) : null;
}

/** 확대 단계. 맞춤은 자리에 맞추고, 나머지는 원본 비율로 키운다. */
const ZOOMS = [1, 1.6, 2.6] as const;

/**
 * 도안 이미지 보기.
 *
 * 도안은 읽는 이미지다 — 코 기호와 숫자를 봐야 하므로 확대와 이동이 없으면
 * 쓸 수 없다. 확대는 컨테이너를 스크롤 가능한 상태로 두고 이미지를 키우는
 * 방식으로 한다. 브라우저의 스크롤·터치 드래그를 그대로 쓸 수 있어서 직접
 * 만든 팬 제스처보다 손에 익다.
 */
export function ImageStage({
  photo,
  maxHeight = "70vh",
}: {
  photo: ProjectPhoto;
  maxHeight?: string;
}) {
  const t = useStrings();
  const [step, setStep] = useState(0);
  const zoom = ZOOMS[step];

  return (
    <div className="relative h-full">
      <div
        style={{ maxHeight }}
        className={cn(
          "flex h-full min-h-40 justify-center",
          zoom === 1 ? "overflow-hidden" : "overflow-auto"
        )}
      >
        <PhotoImage
          photo={photo}
          className={cn(
            zoom === 1 ? "h-full w-auto object-contain" : "max-w-none"
          )}
        />
      </div>

      <Button
        icon
        variant="secondary"
        aria-label={t.workbench.zoom}
        className="bg-surface/90 absolute top-2 right-2"
        onClick={() => setStep((s) => (s + 1) % ZOOMS.length)}
      >
        <Maximize2 size={16} />
      </Button>
      {zoom !== 1 && (
        <span className="bg-surface/90 text-caption text-text-2 absolute top-3 left-2 rounded-sm px-1.5">
          {zoom}×
        </span>
      )}
    </div>
  );
}

/** 트레이용 작은 그림 */
export function ItemThumb({ item }: { item: ViewerItem }) {
  if (item.kind === "video" && item.video) {
    return (
      <span className="relative block size-full">
        <img
          src={`https://i.ytimg.com/vi/${item.video.videoId}/default.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <Youtube size={16} className="text-white drop-shadow" aria-hidden />
        </span>
      </span>
    );
  }
  return item.photo ? (
    <PhotoImage photo={item.photo} className="size-full object-cover" />
  ) : null;
}
