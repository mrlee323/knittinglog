import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderCard, type CardSpec } from "@/features/card/render";
import { shareCard } from "@/features/card/share";
import { useStrings } from "@/i18n";

/**
 * 카드를 그려 보여주고 내보내는 시트.
 *
 * **먼저 보여준 다음 내보낸다.** 남의 타임라인에 올라가는 이미지라 무엇이 담기는지
 * 보고 나서 결정해야 하고, 기술적으로도 그래야 한다 — 카드를 그리는 동안 await가
 * 끼면 `navigator.share`가 사용자 동작 밖에서 불린 것으로 취급되어 iOS에서 거부된다.
 */
export function ShareCardSheet({
  spec,
  onClose,
}: {
  spec: CardSpec;
  onClose: () => void;
}) {
  const t = useStrings();
  const [preview, setPreview] = useState<{ blob: Blob; url: string }>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | undefined;

    void (async () => {
      try {
        const blob = await renderCard(spec);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ blob, url: objectUrl });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [spec]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.card.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="shadow-overlay pb-safe bg-surface max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-subhead mb-1 font-semibold">{t.card.title}</h2>
        <p className="text-text-2 text-small mb-4">{t.card.hint}</p>

        <div className="border-line bg-sunken mb-4 overflow-hidden rounded-md border">
          {failed ? (
            <p className="text-text-2 text-small px-4 py-10 text-center">
              {t.card.failed}
            </p>
          ) : preview ? (
            <img
              src={preview.url}
              alt={t.card.title}
              className="block h-auto w-full"
            />
          ) : (
            // 자리를 미리 잡아둔다 — 그리는 동안 시트가 커지면 손가락 아래에서
            // 버튼이 움직인다
            <div className="aspect-[4/5] w-full" aria-busy="true" />
          )}
        </div>

        <div className="flex gap-2">
          <Button
            block
            disabled={!preview || busy}
            onClick={async () => {
              if (!preview) return;
              setBusy(true);
              try {
                await shareCard(preview.blob, spec.title, new Date());
              } finally {
                setBusy(false);
              }
            }}
          >
            <Share2 size={16} />
            {t.card.share}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t.action.close}
          </Button>
        </div>

        {/* 공유 시트가 없는 곳에서도 길이 있다는 걸 보여준다 */}
        <p className="text-text-3 text-caption mt-2 flex items-center gap-1">
          <Download size={12} aria-hidden />
          {t.card.downloadNote}
        </p>
      </div>
    </div>
  );
}
