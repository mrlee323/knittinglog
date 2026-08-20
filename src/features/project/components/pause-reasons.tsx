import { useLiveQuery } from "dexie-react-hooks";
import { medianPauseDays, reasonOutcomes } from "@/domain/stats";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import type { ReasonOutcome } from "@/domain/stats";

/**
 * 사유별로 몇 번 멈췄고 어떻게 끝났는지.
 *
 * 이 앱의 전제가 "중단은 실패가 아니라 정상 상태"이므로, 멈춘 이유를 마주보는
 * 자리가 있어야 한다. 다만 **매일 볼 것은 아니다** — 그래서 전용 화면(옛 기록 탭)을
 * 두는 대신, 프로젝트 목록을 "중단"으로 걸렀을 때만 그 아래에 나온다. 멈춘 작품들을
 * 보고 있을 때가 "나는 왜 멈추나"를 물을 자리다.
 */
export function PauseReasons() {
  const t = useStrings();
  const events = useLiveQuery(() => db.pauseEvents.toArray(), []);

  if (!events) return null;
  const reasons = reasonOutcomes(events);
  // 모르는 사유가 들어와도 "undefined"가 화면에 닿지 않게 한다. 타입이 막아주는
  // 값이지만, 저장된 데이터는 앱보다 오래 산다.
  const reasonLabel = (reason: string) =>
    (t.pauseReason as Record<string, string>)[reason] ?? t.pauseReason.other;
  if (reasons.length === 0) return null;
  // 열려 있는 중단의 경과일을 지금 기준으로 세므로 현재 시각이 필요하다
  const medianDays = medianPauseDays(events, new Date());

  return (
    <section className="border-line mt-8 rounded-md border p-4">
      <h2 className="text-micro text-text-3 mb-1">{t.project.reasonTitle}</h2>
      <p className="text-text-3 text-caption mb-3">{t.project.reasonNote}</p>

      <p className="text-subhead font-semibold">
        {t.project.reasonTop.replace(
          "{reason}",
          reasonLabel(reasons[0].reason)
        )}
      </p>
      {medianDays !== null && (
        <p className="text-text-2 text-small mb-3">
          {t.project.medianPause.replace("{n}", String(medianDays))}
        </p>
      )}
      <ul className="space-y-2">
        {reasons.map((outcome) => (
          <li key={outcome.reason}>
            <ReasonBar
              label={reasonLabel(outcome.reason)}
              outcome={outcome}
              max={reasons[0].total}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReasonBar({
  label,
  outcome,
  max,
}: {
  label: string;
  outcome: ReasonOutcome;
  max: number;
}) {
  const t = useStrings();
  // 횟수만 보여주면 "자주 멈추는 사유"까지만 알 수 있다. 돌아온 횟수를 함께
  // 두면 대응이 갈린다 — 늘 돌아오는 사유는 그냥 리듬이고, 한 번 멈추면
  // 안 돌아오는 사유가 실제로 손봐야 할 것이다.
  //
  // 아는 사실만 적는다. resumed가 0인 것은 "아직 안 돌아왔다"는 뜻이 아니다 —
  // 완성으로 끝났을 수도, 풀어버렸을 수도 있다. 그걸 뭉개서 "아직 안 돌아옴"이라
  // 쓰면 완성한 작품을 방치한 것처럼 말하게 된다.
  const facts = [t.project.reasonCount.replace("{n}", String(outcome.total))];
  if (outcome.resumed > 0) {
    facts.push(
      t.project.reasonReturned.replace("{n}", String(outcome.resumed))
    );
  }
  if (outcome.open > 0) {
    facts.push(t.project.reasonOpen.replace("{n}", String(outcome.open)));
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-small">{label}</span>
        <span className="text-text-2 text-caption shrink-0">
          {facts.join(" · ")}
        </span>
      </div>
      <div className="bg-sunken h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-hibernating h-full rounded-full"
          style={{ width: `${(outcome.total / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
