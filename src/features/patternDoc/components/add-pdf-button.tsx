import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import {
  addPatternDoc,
  NotPdfError,
} from "@/features/patternDoc/repository";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id } from "@/types/entities";

/**
 * PDF 도안 넣기.
 *
 * 사진 올리기와 같은 모양의 버튼이지만 저장 경로가 다르다 — 압축하지 않고
 * 원본을 그대로 두고, 대신 페이지 수를 세어 함께 저장한다.
 *
 * 넣는 데 시간이 조금 걸린다(pdf.js를 처음 받고 문서를 열어본다). 그래서 진행
 * 표시를 두고, 처음 한 번만 그렇다는 것을 알린다.
 */
export function AddPdfButton({
  projectId,
  onAdded,
}: {
  projectId: Id;
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
      const ids: Id[] = [];
      for (const file of Array.from(files)) {
        ids.push(await addPatternDoc(projectId, file));
      }
      if (ids.length === 1) onAdded?.(ids[0]);
    } catch (cause) {
      // 열 수 없는 파일은 넣는 순간 알려준다. 뜨려고 앉았을 때 알게 되면
      // 그때는 도안이 없는 셈이다.
      setError(
        cause instanceof NotPdfError ? t.patternDoc.notPdf : t.patternDoc.failed
      );
    } finally {
      setSaving(false);
      // 같은 파일을 다시 고를 수 있게 비운다
      if (input.current) input.current.value = "";
    }
  }

  return (
    <span className="shrink-0">
      <label
        className={cn(
          "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap transition",
          saving && "opacity-40"
        )}
        aria-busy={saving}
      >
        <FileText size={16} aria-hidden />
        {saving ? t.patternDoc.adding : t.patternDoc.add}
        <input
          ref={input}
          type="file"
          // 확장자도 함께 받는다 — 안드로이드 파일 선택기가 MIME 타입만으로는
          // PDF를 걸러주지 않는 경우가 있다.
          accept="application/pdf,.pdf"
          multiple
          disabled={saving}
          className="sr-only"
          aria-label={t.patternDoc.add}
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </label>
      {error && <p className="text-frogged text-caption mt-1">{error}</p>}
    </span>
  );
}
