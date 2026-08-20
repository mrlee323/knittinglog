import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/ui/page";
import { SelectField, TextField } from "@/components/ui/field";
import { YarnTile } from "@/features/yarn/components/yarn-swatch";
import { listYarns } from "@/features/yarn/repository";
import { skeinsForMeters, substituteSkeins } from "@/domain/yarn";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/yarn/calc")({ component: YarnCalc });

const num = (raw: string) => {
  const parsed = Number(raw);
  return raw.trim() === "" || Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * 실 계산기 — 기획 §3.8.
 *
 * 두 질문에 답한다. **몇 타래를 사야 하나**(소요량)와 **다른 실로 바꾸면 몇
 * 타래인가**(대체). 둘 다 실을 사기 **전에** 하는 계산이라 스태시에 아직
 * 없는 실을 다룰 수 있어야 한다 — 그래서 직접 입력이 기본이고 스태시에서
 * 고르는 것은 채워 넣는 편의다.
 *
 * 타래 수는 언제나 올림이다. 0.3타래를 팔지 않는다.
 */
function YarnCalc() {
  const t = useStrings();
  const yarns = useLiveQuery(() => listYarns(), []);

  // 타래 길이를 모르는 실은 이 계산에 쓸 수 없다
  const usable = (yarns ?? []).filter((y) => (y.skeinMeters ?? 0) > 0);

  return (
    <Page title={t.yarnCalc.title}>
      <Link
        to="/yarn"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.yarn.title}
      </Link>

      <SkeinCount options={usable} />
      <Substitute options={usable} />
    </Page>
  );
}

interface YarnOption {
  id: string;
  name: string;
  colorHex?: string;
  skeinMeters?: number;
}

/** 스태시에서 타래 길이를 가져오는 선택 필드. 고르면 아래 입력이 채워진다. */
function StashPicker({
  options,
  value,
  onPick,
  label,
}: {
  options: YarnOption[];
  value: string;
  onPick: (id: string, skeinMeters: number) => void;
  label: string;
}) {
  const t = useStrings();
  if (options.length === 0) return null;

  const selected = options.find((y) => y.id === value);

  return (
    <SelectField
      label={label}
      value={value}
      onChange={(e) => {
        const picked = options.find((y) => y.id === e.target.value);
        onPick(e.target.value, picked?.skeinMeters ?? 0);
      }}
      options={[
        { value: "", label: t.yarnCalc.manual },
        ...options.map((y) => ({
          value: y.id,
          label: `${y.name} · ${y.skeinMeters}m`,
        })),
      ]}
      before={<YarnTile color={selected?.colorHex} />}
    />
  );
}

/* --- 소요량 --------------------------------------------------------------- */

function SkeinCount({ options }: { options: YarnOption[] }) {
  const t = useStrings();
  const [meters, setMeters] = useState("1200");
  const [skeinMeters, setSkeinMeters] = useState("200");
  const [pickedId, setPickedId] = useState("");

  const needed = num(meters);
  const perSkein = num(skeinMeters);
  const skeins =
    needed !== undefined && perSkein !== undefined && perSkein > 0
      ? skeinsForMeters(needed, perSkein)
      : null;

  return (
    <Section title={t.yarnCalc.need} hint={t.yarnCalc.needHint}>
      <StashPicker
        options={options}
        value={pickedId}
        label={t.yarnCalc.pickFromStash}
        onPick={(id, m) => {
          setPickedId(id);
          if (m > 0) setSkeinMeters(String(m));
        }}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.yarnCalc.meters}
            inputMode="decimal"
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.yarnCalc.skeinMeters}
            inputMode="decimal"
            value={skeinMeters}
            onChange={(e) => setSkeinMeters(e.target.value)}
          />
        </div>
      </div>

      {skeins !== null && (
        <Result>
          <strong className="text-subhead font-semibold">
            {t.yarnCalc.skeins.replace("{n}", String(skeins))}
          </strong>
        </Result>
      )}
    </Section>
  );
}

/* --- 실 대체 -------------------------------------------------------------- */

function Substitute({ options }: { options: YarnOption[] }) {
  const t = useStrings();
  const [skeins, setSkeins] = useState("5");
  const [originalMeters, setOriginalMeters] = useState("200");
  const [replacementMeters, setReplacementMeters] = useState("160");
  const [pickedId, setPickedId] = useState("");

  const count = num(skeins);
  const from = num(originalMeters);
  const to = num(replacementMeters);

  const ready =
    count !== undefined && from !== undefined && to !== undefined && to > 0;
  const result = ready
    ? substituteSkeins(
        { skeins: count, skeinMeters: from },
        { skeinMeters: to }
      )
    : null;

  return (
    <Section title={t.yarnCalc.substitute} hint={t.yarnCalc.substituteHint}>
      <div className="flex gap-3">
        <div className="flex-1">
          <TextField
            label={t.yarnCalc.originalSkeins}
            inputMode="decimal"
            value={skeins}
            onChange={(e) => setSkeins(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label={t.yarnCalc.originalMeters}
            inputMode="decimal"
            value={originalMeters}
            onChange={(e) => setOriginalMeters(e.target.value)}
          />
        </div>
      </div>

      {/* 바꿀 실은 대개 내가 가진 실이다 — 여기가 스태시를 고를 자리다 */}
      <StashPicker
        options={options}
        value={pickedId}
        label={t.yarnCalc.pickFromStash}
        onPick={(id, m) => {
          setPickedId(id);
          if (m > 0) setReplacementMeters(String(m));
        }}
      />

      <TextField
        label={t.yarnCalc.replacementMeters}
        inputMode="decimal"
        value={replacementMeters}
        onChange={(e) => setReplacementMeters(e.target.value)}
      />

      {result !== null && (
        <Result>
          <strong className="text-subhead font-semibold">
            {t.yarnCalc.skeins.replace("{n}", String(result))}
          </strong>
          <span className="text-text-2 text-caption">
            {t.yarnCalc.totalMeters.replace(
              "{n}",
              String(Math.round(count! * from!))
            )}
          </span>
        </Result>
      )}
    </Section>
  );
}

/* --- 공통 ----------------------------------------------------------------- */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-line mb-6 border-t pt-5">
      <h2 className="mb-1 font-medium">{title}</h2>
      {hint && <p className="text-text-3 text-caption mb-3">{hint}</p>}
      {children}
    </section>
  );
}

function Result({ children }: { children: ReactNode }) {
  return (
    <div className="border-line flex flex-col gap-1 rounded-md border p-4 text-center">
      {children}
    </div>
  );
}
