import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Page } from "@/components/ui/page";
import { createChartRecord } from "@/features/chart/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/charts/new")({ component: NewChart });

/** 페어아일 무늬는 대개 20코 안쪽에서 반복된다. 거기서 출발한다. */
const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 20;

function NewChart() {
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
      setError(t.chart.name);
      return;
    }
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return;

    setSaving(true);
    try {
      const id = await createChartRecord({
        name: name.trim(),
        // 칸이 너무 많으면 편집이 무거워진다. 무늬 반복 단위는 대개 훨씬 작다.
        width: Math.min(120, Math.floor(w)),
        height: Math.min(200, Math.floor(h)),
      });
      await navigate({ to: "/charts/$chartId", params: { chartId: id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={t.chart.add}>
      <form onSubmit={submit} noValidate>
        <TextField
          label={t.chart.name}
          placeholder={t.chart.namePlaceholder}
          value={name}
          error={error}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.chart.widthLabel}
              inputMode="numeric"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.chart.heightLabel}
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
            onClick={() => navigate({ to: "/charts" })}
          >
            {t.action.cancel}
          </Button>
        </div>
      </form>
    </Page>
  );
}
