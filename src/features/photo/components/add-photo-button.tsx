import { useRef, useState } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { addPhoto } from "@/features/photo/repository";
import { isQuotaError } from "@/features/backup/storage";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id, ProjectPhoto } from "@/types/entities";

/**
 * 사진 올리기.
 *
 * 진행 기록·참고 자료·도안이 모두 같은 저장 경로(압축 → IndexedDB)를 쓰므로
 * 버튼도 하나로 둔다. 다른 건 kind와 라벨뿐이다.
 *
 * capture 속성을 주지 않는다. 카메라를 강제하면 이미 찍어둔 사진이나 캡처한
 * 도안을 고를 수 없어지는데, 그쪽이 훨씬 흔하다.
 */
export function AddPhotoButton({
  projectId,
  kind,
  label,
  icon = "image",
  onAdded,
}: {
  projectId: Id;
  kind: NonNullable<ProjectPhoto["kind"]>;
  label: string;
  icon?: "camera" | "image";
  /** 한 장만 올렸을 때 호출된다. 여러 장이면 어느 장을 가리킬지 알 수 없다. */
  onAdded?: (id: Id) => void;
}) {
  const t = useStrings();
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function handleFiles(files: FileList) {
    setSaving(true);
    setError(undefined);
    try {
      // 한 장씩 처리한다. 여러 장을 동시에 디코딩하면 저사양 기기에서
      // 메모리가 튀어 탭이 죽는다.
      const ids: Id[] = [];
      for (const file of Array.from(files)) {
        ids.push(await addPhoto(projectId, file, kind));
      }
      if (ids.length === 1) onAdded?.(ids[0]);
    } catch (cause) {
      // 저장 공간이 부족해 실패한 것을 조용히 넘기면 사진이 올라간 줄 안다
      setError(isQuotaError(cause) ? t.photo.quotaFull : t.photo.saveFailed);
    } finally {
      setSaving(false);
      // 같은 파일을 다시 고를 수 있게 비운다. 안 비우면 두 번째 선택에서
      // change 이벤트가 아예 발생하지 않는다.
      if (input.current) input.current.value = "";
    }
  }

  const Icon = icon === "camera" ? Camera : ImagePlus;

  return (
    <span className="inline-flex shrink-0 flex-col">
      <label
        className={cn(
          "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap transition",
          saving && "opacity-40"
        )}
        aria-busy={saving}
      >
        <Icon size={16} aria-hidden />
        {saving ? t.photo.saving : label}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          disabled={saving}
          className="sr-only"
          aria-label={label}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </label>
      {error && <span className="text-frogged text-caption mt-1">{error}</span>}
    </span>
  );
}
