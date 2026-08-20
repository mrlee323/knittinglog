import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Page } from "@/components/ui/page";
import { createStitchChartRecord } from "@/features/stitchChart/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/patterns/new")({
  component: NewPattern,
});

/**
 * 무늬 반복 단위는 배색 문양보다 작다. 레이스는 흔히 한 자리 코수로 반복되고,
 * 케이블도 10코 안쪽이 많다. 작게 시작해서 늘리는 게 맞다.
 */
const DEFAULT_WIDTH = 12;
const DEFAULT_HEIGHT = 12;

function NewPattern() {
  const t = useStrings();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [width, setWidth] = useState(String(DEFAULT_WIDTH));
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const w = Number(width);
    const h = Number(height);
    if (!name.trim()) {
      setError(t.pattern.name);
      return;
    }
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return;

    setSaving(true);
    try {
      const id = await createStitchChartRecord({
        name: name.trim(),
        width: Math.min(120, Math.floor(w)),
        height: Math.min(200, Math.floor(h)),
      });
      await navigate({ to: "/patterns/$patternId", params: { patternId: id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={t.pattern.add}>
      <form onSubmit={submit} noValidate>
        <TextField
          label={t.pattern.name}
          placeholder={t.pattern.namePlaceholder}
          value={name}
          error={error}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.pattern.widthLabel}
              inputMode="numeric"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.pattern.heightLabel}
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="submit" block disabled={saving}>
            {t.action.create}
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/patterns" })}
          >
            {t.action.cancel}
          </Button>
        </div>
      </form>
    </Page>
  );
}
