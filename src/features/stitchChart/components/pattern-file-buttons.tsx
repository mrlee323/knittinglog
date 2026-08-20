import { useState } from "react";
import { FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportPattern, importPatternFile } from "@/features/stitchChart/file";
import { shareCard } from "@/features/card/share";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id, StitchChartRecord } from "@/types/entities";

/**
 * 도안을 파일로 보낸다 — LOUNGE.md 0단계.
 *
 * 서버도 계정도 없이 도안 공유가 성립한다. 공유 시트가 있으면 그리로, 없으면
 * 내려받기로 떨어진다 — 카드 공유와 같은 경로를 쓴다.
 */
export function SendPatternButton({ record }: { record: StitchChartRecord }) {
  const t = useStrings();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { blob, fileName } = await exportPattern(record);
          // 카드 공유와 같은 함수를 쓴다. 파일 이름을 그대로 쓰려고 확장자까지
          // 만들어 넘긴다.
          await shareCard(blob, record.name, new Date(), fileName);
        } finally {
          setBusy(false);
        }
      }}
    >
      <FileDown size={16} />
      {t.pattern.shareFile}
    </Button>
  );
}

/**
 * 받은 도안 파일을 넣는다.
 *
 * 공유하기로도 들어오지만(Share Target), 메일 첨부처럼 파일로 받은 경우와 PC에서는
 * 직접 고르는 길이 필요하다.
 */
export function ReceivePatternButton({
  onAdded,
}: {
  onAdded?: (id: Id) => void;
}) {
  const t = useStrings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean }>();

  return (
    <span className="inline-flex flex-col">
      <label
        className={cn(
          "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap",
          busy && "opacity-40"
        )}
        aria-busy={busy}
      >
        <FileUp size={16} aria-hidden />
        {t.pattern.importFile}
        <input
          type="file"
          // 확장자도 함께 받는다 — 안드로이드 파일 선택기가 MIME 타입만으로
          // 걸러주지 않는 경우가 있다.
          accept="application/json,.json"
          className="sr-only"
          disabled={busy}
          aria-label={t.pattern.importFile}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setMessage(undefined);
            try {
              const result = await importPatternFile(file);
              if (!result.ok) {
                setMessage({
                  text:
                    result.problem === "isBackup"
                      ? t.pattern.importIsBackup
                      : result.problem === "tooNew"
                        ? t.pattern.importTooNew
                        : t.pattern.importNotPattern,
                  bad: true,
                });
                return;
              }
              const added = result.added ?? [];
              setMessage({
                text:
                  added.length === 1
                    ? t.pattern.imported.replace("{name}", added[0].name)
                    : t.pattern.importedMany.replace(
                        "{n}",
                        String(added.length)
                      ),
              });
              if (added.length === 1) onAdded?.(added[0].id);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {message && (
        <span
          className={cn(
            "text-caption mt-1",
            message.bad ? "text-frogged" : "text-text-2"
          )}
        >
          {message.text}
        </span>
      )}
    </span>
  );
}
