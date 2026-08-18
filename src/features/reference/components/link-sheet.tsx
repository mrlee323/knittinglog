import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { parseYouTube } from "@/domain/youtube";
import { VideoEmbed } from "@/features/reference/components/video-embed";
import { useStrings } from "@/i18n";
import type { LinkFormValues } from "@/features/reference/repository";

/**
 * 영상 링크 추가·수정.
 *
 * 주소를 붙여넣는 즉시 영상을 미리 보여준다. 유튜브 주소는 형태가 제각각이라
 * 저장한 뒤에 "이게 그 영상이 맞나"를 확인하게 되는데, 그 확인을 입력 중에
 * 끝내는 편이 낫다. 미리보기가 뜨지 않으면 그건 못 읽은 주소다.
 */
export function LinkSheet({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: LinkFormValues;
  onSubmit: (values: LinkFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  // 미리보기에서 재생을 시도해봤을 때 임베드가 막힌 영상으로 드러나면
  // 저장 전에 알려준다. 저장 자체는 막지 않는다 — 링크로서는 여전히 쓸모가
  // 있고, 누르면 유튜브에서 열린다.
  const [blocked, setBlocked] = useState(false);

  const parsed = parseYouTube(url);
  const touched = url.trim().length > 0;

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    try {
      await onSubmit({
        url: url.trim(),
        title: title.trim() || undefined,
        note: note.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.reference.addVideo}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="shadow-overlay pb-safe bg-surface w-full max-w-lg rounded-t-lg p-5 sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-heading mb-4 font-semibold">
          {t.reference.addVideo}
        </h2>

        <TextField
          label={t.reference.url}
          placeholder="https://youtu.be/..."
          value={url}
          autoFocus
          inputMode="url"
          error={touched && !parsed ? t.reference.notYouTube : undefined}
          onChange={(e) => setUrl(e.target.value)}
        />

        {parsed && (
          <div className="mb-4">
            <VideoEmbed
              video={parsed}
              title={title || undefined}
              blocked={blocked}
              onBlocked={() => setBlocked(true)}
            />
            {blocked && (
              <p className="text-hibernating text-caption mt-1.5">
                {t.reference.embedBlocked}
              </p>
            )}
          </div>
        )}

        <TextField
          label={t.reference.videoTitle}
          placeholder={t.reference.videoTitlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label={t.reference.note}
          placeholder={t.reference.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <Button block disabled={!parsed || saving} onClick={handleSave}>
            {t.action.save}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {t.action.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
