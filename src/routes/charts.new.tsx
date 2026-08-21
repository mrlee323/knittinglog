import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Page } from "@/components/ui/page";
import { createChartRecord } from "@/features/chart/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/charts/new")({ component: NewChart });

/** 페어아일 무늬는 대개 20코 안쪽에서 반복된다. 거기서 출발한다. */
/**
 * 격자 상한.
 *
 * 칸이 너무 많으면 편집이 무거워진다. 전에는 저장할 때 조용히 깎았는데,
 * 500을 넣은 사람이 120을 받으면 그것도 말 없이 다르게 동작한 것이다.
 * 이제 칸 밑에 상한을 미리 적는다.
 */
/** 격자 한 변으로 쓸 수 없는 값인가 — 빈 칸, 숫자 아님, 1보다 작음 */
const badSize = (n: number) => !Number.isFinite(n) || n < 1;

const MAX_WIDTH = 120;
const MAX_HEIGHT = 200;

const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 20;

function NewChart() {
  const t = useStrings();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [width, setWidth] = useState(String(DEFAULT_WIDTH));
  const [height, setHeight] = useState(String(DEFAULT_HEIGHT));
  const [nameError, setNameError] = useState<string>();
  const [widthError, setWidthError] = useState<string>();
  const [heightError, setHeightError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const w = Number(width);
    const h = Number(height);
    setNameError(undefined);
    if (!name.trim()) {
      setNameError(t.validate.nameRequired);
      return;
    }

    /* 전에는 여기서 아무 말 없이 돌아섰다. 칸을 비우고 누르면 아무 일도
       일어나지 않아 버튼이 고장난 것처럼 보였다.

       칸마다 따로 본다. 하나로 묶으면 코수만 비웠는데 단수 밑에도 같은 말이
       떠서, 고쳐야 할 칸이 어디인지 되레 흐려진다. */
    const wBad = badSize(w) ? t.validate.sizeRequired : undefined;
    const hBad = badSize(h) ? t.validate.sizeRequired : undefined;
    setWidthError(wBad);
    setHeightError(hBad);
    if (wBad || hBad) return;

    setSaving(true);
    try {
      const id = await createChartRecord({
        name: name.trim(),
        width: Math.min(MAX_WIDTH, Math.floor(w)),
        height: Math.min(MAX_HEIGHT, Math.floor(h)),
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
          error={nameError}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField
              label={t.chart.widthLabel}
              hint={t.validate.maxStitches.replace("{n}", String(MAX_WIDTH))}
              error={widthError}
              inputMode="numeric"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextField
              label={t.chart.heightLabel}
              hint={t.validate.maxRows.replace("{n}", String(MAX_HEIGHT))}
              error={heightError}
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
