import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ExternalLink, ImagePlus, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { CardGrid, Page } from "@/components/ui/page";
import { InspirationImage } from "@/features/inspiration/components/inspiration-image";
import {
  addInspiration,
  assignInspiration,
  deleteInspiration,
  listInspirations,
} from "@/features/inspiration/repository";
import { listProjects } from "@/features/project/repository";
import { parseShared, sourceHost } from "@/domain/shared";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Id, Inspiration } from "@/types/entities";

export const Route = createFileRoute("/inspiration")({
  component: InspirationBox,
  validateSearch: (search: Record<string, unknown>) => ({
    received: Number(search.received) || 0,
  }),
});

type Filter = "all" | "unassigned";

function InspirationBox() {
  const t = useStrings();
  const { received } = Route.useSearch();
  const items = useLiveQuery(() => listInspirations(), []);
  const projects = useLiveQuery(() => listProjects(), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingDelete, setPendingDelete] = useState<Inspiration>();

  const shown = (items ?? []).filter(
    (item) => filter === "all" || !item.projectId
  );
  const pending = items?.find((i) => i.id === pendingDelete?.id);

  return (
    <Page wide title={t.inspiration.title}>
      {/* 공유로 들어온 직후에는 무엇이 들어왔는지 말해준다 */}
      {received > 0 && (
        <p className="text-finished text-small mb-4">
          {t.inspiration.received.replace("{n}", String(received))}
        </p>
      )}

      <p className="text-text-2 text-small">{t.inspiration.shareHint}</p>
      {/* iOS는 공유 시트 대상이 안 되므로 붙여넣기 경로를 함께 안내한다 */}
      <p className="text-text-3 text-caption mt-1 mb-4">
        {t.inspiration.iosNote}
      </p>

      <AddForm />

      {items === undefined ? null : items.length === 0 ? (
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-text-2">{t.inspiration.empty}</p>
          <p className="text-text-3 text-small mx-auto mt-1 max-w-md text-balance">
            {t.inspiration.emptyHint}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-1.5">
            {(["all", "unassigned"] as Filter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "text-caption rounded-sm px-2 py-1.5 transition",
                  filter === value
                    ? "bg-accent text-on-accent font-semibold"
                    : "bg-sunken text-text-2"
                )}
              >
                {value === "all"
                  ? t.inspiration.filterAll
                  : t.inspiration.filterUnassigned}
              </button>
            ))}
            <span className="text-text-3 text-caption ml-auto self-center">
              {t.inspiration.count.replace("{n}", String(shown.length))}
            </span>
          </div>

          <CardGrid columns={3}>
            {shown.map((item) => (
              <li key={item.id}>
                <Card
                  item={item}
                  projects={projects ?? []}
                  onDelete={() => setPendingDelete(item)}
                />
              </li>
            ))}
          </CardGrid>
        </>
      )}

      {pending && (
        <ConfirmSheet
          title={t.inspiration.deleteConfirm}
          description={pending.title ?? pending.sourceUrl}
          confirmLabel={t.action.delete}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            void deleteInspiration(pending.id);
            setPendingDelete(undefined);
          }}
        />
      )}
    </Page>
  );
}

/** 붙여넣기·이미지 고르기 — 공유 시트가 없는 곳(iOS·PC)의 입구 */
function AddForm() {
  const t = useStrings();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      // 붙여넣은 글에서 주소를 찾아낸다 — 공유로 들어온 것과 같은 규칙이다.
      // "이거 봐 https://…"를 그대로 붙여도 주소가 살아난다.
      const draft = parseShared({ url, text: note });
      await addInspiration(draft);
      setUrl("");
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-line mb-6 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <TextField
            label={t.inspiration.urlLabel}
            className="mb-0"
            placeholder={t.inspiration.urlPlaceholder}
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving || (!url.trim() && !note.trim())}>
          <Link2 size={16} />
          {t.inspiration.save}
        </Button>
        <ImagePicker />
      </div>
      <div className="mt-3">
        <TextAreaField
          label={t.inspiration.noteLabel}
          className="mb-0"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </form>
  );
}

function ImagePicker() {
  const t = useStrings();
  const [saving, setSaving] = useState(false);

  return (
    <label
      className={cn(
        "text-small bg-sunken text-text inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium whitespace-nowrap",
        saving && "opacity-40"
      )}
      aria-busy={saving}
    >
      <ImagePlus size={16} aria-hidden />
      {t.inspiration.addImage}
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={saving}
        className="sr-only"
        aria-label={t.inspiration.addImage}
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          setSaving(true);
          try {
            // 한 장씩 처리한다 — 여러 장을 동시에 디코딩하면 저사양 기기에서
            // 메모리가 튄다(사진 올리기와 같은 이유).
            for (const file of files) await addInspiration({}, file);
          } finally {
            setSaving(false);
            e.target.value = "";
          }
        }}
      />
    </label>
  );
}

function Card({
  item,
  projects,
  onDelete,
}: {
  item: Inspiration;
  projects: { id: Id; name: string }[];
  onDelete: () => void;
}) {
  const t = useStrings();
  const host = sourceHost(item.sourceUrl);

  return (
    <div className="border-line bg-surface flex flex-col gap-2 rounded-md border p-3">
      {item.blob && (
        <div className="bg-sunken overflow-hidden rounded-sm">
          <InspirationImage item={item} className="max-h-56 w-full object-cover" />
        </div>
      )}

      {item.title && (
        <p className="text-subhead font-semibold break-words">{item.title}</p>
      )}
      {item.note && (
        <p className="text-text-2 text-small whitespace-pre-wrap break-words">
          {item.note}
        </p>
      )}

      {item.sourceUrl && (
        // 임의의 사이트는 앱 안에서 열 수 없다. 원래 자리로 보내는 것이 정직하다.
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-text-2 text-caption inline-flex items-center gap-1 underline"
        >
          <ExternalLink size={13} aria-hidden />
          {host ?? t.inspiration.openExternal}
        </a>
      )}

      {/* 어느 작품에 쓸지 — 보관함의 핵심 동작이다 */}
      <SelectField
        label={t.inspiration.forProject}
        className="mb-0 mt-auto"
        value={item.projectId ?? ""}
        onChange={(e) =>
          void assignInspiration(item.id, e.target.value || undefined)
        }
        options={[
          { value: "", label: t.inspiration.unassigned },
          ...projects.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />

      <div className="flex items-center gap-2">
        {item.projectId && (
          <Link
            to="/projects/$projectId/refs"
            params={{ projectId: item.projectId }}
            className="text-text-2 text-caption underline"
          >
            {t.nav.projects}
          </Link>
        )}
        <Button
          variant="danger"
          className="!text-caption !min-h-9 ml-auto !px-2"
          onClick={onDelete}
        >
          <Trash2 size={13} />
          {t.action.delete}
        </Button>
      </div>
    </div>
  );
}
