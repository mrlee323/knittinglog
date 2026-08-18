import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ImagePlus, Trash2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseYouTube } from "@/domain/youtube";
import { PhotoImage } from "@/features/photo/components/photo-image";
import { addPhoto, listReferencePhotos } from "@/features/photo/repository";
import { PhotoViewer } from "@/features/photo/components/photo-viewer";
import {
  VideoEmbed,
  WatchOnYouTube,
} from "@/features/reference/components/video-embed";
import { LinkSheet } from "@/features/reference/components/link-sheet";
import {
  addLink,
  deleteLink,
  listLinks,
} from "@/features/reference/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * 참고 자료.
 *
 * 프로젝트를 시작할 때 모으는 것들 — 뜨고 싶은 모양 사진, 배색 견본, 도안 영상.
 * 진행 기록과 나눠 두는 이유는 읽는 시점이 다르기 때문이다. 진행 기록은 "어디까지
 * 떴나"를 시간순으로 말하고, 참고 자료는 "무엇을 만들려는가"를 계속 상기시킨다.
 * 그래서 시간순으로 쌓지 않고 모은 순서 그대로 둔다.
 */
export function ReferenceSection({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const photos = useLiveQuery(
    () => listReferencePhotos(projectId),
    [projectId]
  );
  const links = useLiveQuery(() => listLinks(projectId), [projectId]);
  const [adding, setAdding] = useState(false);
  const [openAt, setOpenAt] = useState<number>();

  if (photos === undefined || links === undefined) return null;

  const empty = photos.length === 0 && links.length === 0;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-heading font-semibold">{t.reference.title}</h2>
        <div className="flex gap-2">
          <AddImageButton projectId={projectId} />
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Youtube size={16} aria-hidden />
            {t.reference.addVideo}
          </Button>
        </div>
      </div>

      {empty ? (
        <div className="border-line rounded-md border border-dashed px-6 py-10 text-center">
          <p className="text-text-2 text-small">{t.reference.empty}</p>
          <p className="text-text-3 text-caption mx-auto mt-1 max-w-[24rem] text-balance">
            {t.reference.emptyHint}
          </p>
        </div>
      ) : (
        <>
          {photos.length > 0 && (
            <ul className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo, i) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => setOpenAt(i)}
                    className="border-line bg-sunken block w-full overflow-hidden rounded-md border"
                  >
                    <PhotoImage
                      photo={photo}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                  {photo.caption && (
                    <p className="text-text-2 text-caption mt-1 truncate">
                      {photo.caption}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {links.length > 0 && (
            <ul className="space-y-4">
              {links.map((link) => {
                const video = parseYouTube(link.url);
                if (!video) return null;
                return (
                  <li key={link.id}>
                    <VideoEmbed video={video} title={link.title} />
                    <div className="mt-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {link.title && (
                          <p className="text-small font-medium">{link.title}</p>
                        )}
                        {link.note && (
                          <p className="text-text-2 text-caption whitespace-pre-wrap">
                            {link.note}
                          </p>
                        )}
                        <WatchOnYouTube video={video} />
                      </div>
                      <Button
                        icon
                        variant="ghost"
                        aria-label={t.action.delete}
                        onClick={() => void deleteLink(link.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {openAt !== undefined && photos.length > 0 && (
        <PhotoViewer
          projectId={projectId}
          photos={photos}
          index={Math.min(openAt, photos.length - 1)}
          onIndex={setOpenAt}
          onClose={() => setOpenAt(undefined)}
        />
      )}

      {adding && (
        <LinkSheet
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            await addLink(projectId, values);
            setAdding(false);
          }}
        />
      )}
    </section>
  );
}

/** 참고 이미지 추가. 진행 사진과 같은 압축·저장 경로를 쓴다. */
function AddImageButton({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  async function handleFiles(files: FileList) {
    setSaving(true);
    try {
      for (const file of Array.from(files)) {
        await addPhoto(projectId, file, "reference");
      }
    } finally {
      setSaving(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <label
      className={cn(
        "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap transition",
        saving && "opacity-40"
      )}
      aria-busy={saving}
    >
      <ImagePlus size={16} aria-hidden />
      {saving ? t.photo.saving : t.reference.addImage}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        disabled={saving}
        className="sr-only"
        aria-label={t.reference.addImage}
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
        }}
      />
    </label>
  );
}
