import { useEffect, useState } from "react";
import {
  Download,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import {
  applyBackup,
  countRecords,
  exportBackup,
  readBackup,
} from "@/features/backup/repository";
import {
  estimateStorage,
  isPersisted,
  requestPersistence,
} from "@/features/backup/storage";
import {
  backupFileName,
  formatBytes,
  storageLevel,
  type BackupFile,
  type ImportMode,
} from "@/domain/backup";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * 백업 · 저장 공간 — 기획 §3.13의 P0.
 *
 * 계정이 없는 앱에서 가장 큰 구멍이 여기다. 기기를 바꾸거나 브라우저 데이터를
 * 지우면 몇 달치 기록이 사라지고, 사용자는 그걸 되돌릴 방법이 없다.
 */
export function BackupCard() {
  const t = useStrings();
  const [records, setRecords] = useState<number>();
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>();
  const [persisted, setPersisted] = useState<boolean>();
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState<"export" | "import" | undefined>();
  const [mode, setMode] = useState<ImportMode>("merge");
  const [pending, setPending] = useState<BackupFile>();

  /* 지금 상태를 읽어온다 */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [counts, estimate, persist] = await Promise.all([
        countRecords(),
        estimateStorage(),
        isPersisted(),
      ]);
      if (cancelled) return;
      setRecords(counts.total);
      setStorage(estimate);
      setPersisted(persist);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const level = storageLevel(storage ?? {});

  async function runExport(includeMedia: boolean) {
    setBusy("export");
    setStatus(undefined);
    try {
      const blob = await exportBackup({ includeMedia });
      const at = new Date();
      download(blob, backupFileName(at, includeMedia));
      setStatus(
        t.backup.exported
          .replace("{n}", String(records ?? 0))
          .replace("{size}", formatBytes(blob.size))
      );
    } catch {
      setStatus(t.backup.exportFailed);
    } finally {
      setBusy(undefined);
    }
  }

  async function pickFile(file: File) {
    setBusy("import");
    setStatus(undefined);
    try {
      const check = await readBackup(file);
      if (!check.ok || !check.file) {
        setStatus(
          check.problem === "tooNew" ? t.backup.tooNew : t.backup.notBackup
        );
        return;
      }
      // 덮어쓰기는 되돌릴 수 없으므로 한 번 더 묻는다
      if (mode === "replace") {
        setPending(check.file);
        return;
      }
      await runImport(check.file, "merge");
    } finally {
      setBusy(undefined);
    }
  }

  async function runImport(file: BackupFile, importMode: ImportMode) {
    setBusy("import");
    try {
      const plan = await applyBackup(file, importMode);
      const counts = await countRecords();
      setRecords(counts.total);
      setStorage(await estimateStorage());

      const lines = [
        plan.added === 0
          ? t.backup.importedNone
          : plan.skipped > 0
            ? t.backup.importedSkipped
                .replace("{n}", String(plan.added))
                .replace("{skipped}", String(plan.skipped))
            : t.backup.imported.replace("{n}", String(plan.added)),
      ];
      // 모르는 테이블은 조용히 버리지 않는다 — 덜 복원됐는지 알 수 없게 된다
      if (plan.unknownTables.length > 0) {
        lines.push(
          t.backup.unknownTables.replace(
            "{tables}",
            plan.unknownTables.join(", ")
          )
        );
      }
      setStatus(lines.join(" "));
    } finally {
      setBusy(undefined);
      setPending(undefined);
    }
  }

  return (
    <section className="border-line mb-5 rounded-md border p-4">
      <h2 className="text-small mb-1 flex items-center gap-2 font-medium">
        <Download size={15} className="text-text-2" aria-hidden />
        {t.backup.title}
      </h2>
      <p className="text-text-2 text-caption mb-4">{t.backup.hint}</p>

      {/* 내보내기 */}
      <div className="mb-4">
        <h3 className="text-micro text-text-3 mb-2">{t.backup.exportTitle}</h3>
        {records !== undefined && (
          <p className="text-text-2 text-caption mb-2">
            {t.backup.recordCount.replace("{n}", String(records))}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={busy !== undefined}
            onClick={() => void runExport(true)}
          >
            {busy === "export" ? t.backup.exporting : t.backup.exportAll}
          </Button>
          <Button
            variant="ghost"
            disabled={busy !== undefined}
            onClick={() => void runExport(false)}
          >
            {t.backup.exportRecordsOnly}
          </Button>
        </div>
        <p className="text-text-3 text-caption mt-1.5">{t.backup.exportHint}</p>
      </div>

      {/* 가져오기 */}
      <div className="border-line mb-4 border-t pt-4">
        <h3 className="text-micro text-text-3 mb-2">{t.backup.importTitle}</h3>
        <div className="bg-sunken mb-2 flex gap-1 rounded-md p-1">
          {(["merge", "replace"] as ImportMode[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "text-caption flex-1 rounded-md py-1.5 transition-colors",
                mode === value
                  ? value === "replace"
                    ? "bg-frogged font-semibold text-white"
                    : "bg-accent text-on-accent font-semibold"
                  : "text-text-2"
              )}
            >
              {value === "merge" ? t.backup.modeMerge : t.backup.modeReplace}
            </button>
          ))}
        </div>
        <label
          className={cn(
            "text-small bg-sunken text-text inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4 font-medium",
            busy !== undefined && "opacity-40"
          )}
        >
          <Upload size={15} aria-hidden />
          {busy === "import" ? t.backup.importing : t.backup.importPick}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy !== undefined}
            className="sr-only"
            aria-label={t.backup.importPick}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void pickFile(file);
            }}
          />
        </label>
        <p className="text-text-3 text-caption mt-1.5">{t.backup.importHint}</p>
      </div>

      {status && <p className="text-text-2 text-small mb-4">{status}</p>}

      {/* 저장 공간 */}
      <div className="border-line mb-4 border-t pt-4">
        <h3 className="text-micro text-text-3 mb-1 flex items-center gap-1.5">
          <HardDrive size={13} aria-hidden />
          {t.backup.storageTitle}
        </h3>
        <p className="text-small">
          {level.level === "unknown"
            ? t.backup.storageUnknown
            : t.backup.storageOf
                .replace("{used}", formatBytes(storage?.usage ?? 0))
                .replace("{quota}", formatBytes(storage?.quota ?? 0))}
        </p>
        {level.ratio !== null && (
          <div className="bg-sunken mt-2 h-1.5 overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full",
                level.level === "full"
                  ? "bg-frogged"
                  : level.level === "tight"
                    ? "bg-hibernating"
                    : "bg-text-3"
              )}
              style={{ width: `${Math.min(100, level.ratio * 100)}%` }}
            />
          </div>
        )}
        {(level.level === "tight" || level.level === "full") && (
          <p
            className={cn(
              "text-caption mt-1.5",
              level.level === "full" ? "text-frogged" : "text-text-2"
            )}
          >
            {level.level === "full"
              ? t.backup.storageFull
              : t.backup.storageTight}
          </p>
        )}
      </div>

      {/* 영속성 — 이걸 못 받으면 브라우저가 데이터를 스스로 지울 수 있다 */}
      <div className="border-line border-t pt-4">
        <h3 className="text-micro text-text-3 mb-1 flex items-center gap-1.5">
          {persisted ? (
            <ShieldCheck size={13} aria-hidden />
          ) : (
            <ShieldAlert size={13} aria-hidden />
          )}
          {t.backup.persistTitle}
        </h3>
        <p
          className={cn(
            "text-small",
            persisted ? "text-text-2" : "text-text"
          )}
        >
          {persisted ? t.backup.persistOn : t.backup.persistOff}
        </p>
        {persisted === false && (
          <Button
            variant="secondary"
            className="mt-2"
            onClick={async () => {
              const granted = await requestPersistence();
              setPersisted(granted);
              if (!granted) setStatus(t.backup.persistDenied);
            }}
          >
            {t.backup.persistAsk}
          </Button>
        )}
      </div>

      {pending && (
        <ConfirmSheet
          title={t.backup.replaceConfirm}
          description={t.backup.replaceConfirmBody.replace(
            "{n}",
            String(records ?? 0)
          )}
          confirmLabel={t.backup.modeReplace}
          onCancel={() => setPending(undefined)}
          onConfirm={() => void runImport(pending, "replace")}
        />
      )}
    </section>
  );
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
