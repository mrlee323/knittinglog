import { useState } from "react";
import { ExternalLink, FileText, Maximize2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfStage } from "@/features/patternDoc/components/pdf-stage";
import { PhotoImage } from "@/features/photo/components/photo-image";
import { VideoEmbed } from "@/features/reference/components/video-embed";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { ViewerItem } from "@/features/reference/items";
import type { ProjectPhoto } from "@/types/entities";

/** 작업대와 뜨기 모드가 같은 뷰어를 쓴다 */
export function ItemViewer({
  item,
  maxHeight = "70vh",
  onEmbedBlocked,
}: {
  item?: ViewerItem;
  /** 뜨기 모드처럼 높이가 정해진 자리에서는 100%를 준다 */
  maxHeight?: string;
  /** 재생해보고 "임베드 금지"임을 알게 되면 알린다 */
  onEmbedBlocked?: (id: string) => void;
}) {
  const t = useStrings();

  if (!item) {
    return (
      <div className="text-text-3 text-caption flex h-full min-h-40 items-center justify-center px-4 text-center">
        {t.workbench.pickItem}
      </div>
    );
  }

  if (item.kind === "pdf" && item.doc) {
    return <PdfStage doc={item.doc} maxHeight={maxHeight} />;
  }

  if (item.kind === "video" && item.video) {
    return (
      // 영상 자리에는 overflow·transform을 걸지 않는다. iframe을 자르거나
      // 변형하는 조상이 있으면 iOS에서 플레이어 조작이 먹지 않을 수 있다.
      <div className="p-2">
        <VideoEmbed
          video={item.video}
          title={item.title}
          blocked={item.embedBlocked}
          onBlocked={() => onEmbedBlocked?.(item.id)}
        />
        {(item.title || item.note) && (
          <div className="mt-1.5">
            {item.title && (
              <p className="text-small font-medium">{item.title}</p>
            )}
            {item.note && (
              <p className="text-text-2 text-caption whitespace-pre-wrap">
                {item.note}
              </p>
            )}
          </div>
        )}
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
          // justify-center를 쓰지 않는다. 내용이 자리보다 넓으면 넘친 부분이
          // 시작 쪽으로 밀려나 스크롤로 닿지 않는다 — 확대해도 도안 왼쪽을 볼
          // 수 없게 된다. auto 마진은 넘칠 때 0으로 풀려서 그 문제가 없다.
          "flex h-full min-h-40",
          zoom === 1 ? "overflow-hidden" : "overflow-auto"
        )}
      >
        <PhotoImage
          photo={photo}
          className={cn(
            "m-auto",
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
  const t = useStrings();

  // PDF는 첫 장을 그려 썸네일로 쓸 수도 있지만, 트레이에 있는 PDF마다 pdf.js가
  // 페이지를 렌더하면 화면이 열릴 때마다 그 값을 치른다. 이름과 쪽수만으로도
  // 무엇을 누르는지는 충분히 알 수 있다.
  if (item.kind === "pdf" && item.doc) {
    return (
      <span className="flex size-full flex-col items-center justify-center gap-1 px-1">
        <FileText size={18} className="text-text-2" aria-hidden />
        <span className="text-micro text-text-2 line-clamp-2 text-center break-all">
          {item.doc.name}
        </span>
        <span className="text-micro text-text-3">
          {t.patternDoc.pages.replace("{n}", String(item.doc.pageCount))}
        </span>
      </span>
    );
  }

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
        {/* 앱에서 재생 안 되는 영상은 트레이에서 미리 알린다 — 눌러보고
            알게 되는 것보다 낫다. */}
        {item.embedBlocked && (
          <span className="text-micro absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-white">
            <ExternalLink size={9} className="inline" aria-hidden />
          </span>
        )}
      </span>
    );
  }
  return item.photo ? (
    <PhotoImage photo={item.photo} className="size-full object-cover" />
  ) : null;
}
