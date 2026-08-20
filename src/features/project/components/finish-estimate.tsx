import { useLiveQuery } from "dexie-react-hooks";
import { finishForecast, type FinishForecast } from "@/domain/finish";
import { db } from "@/lib/db";
import { useLocale, useStrings } from "@/i18n";
import { formatHours } from "../format";
import type { Id } from "@/types/entities";

/** 1년을 넘는 예상일은 날짜로 말할 값이 아니다 — 그건 "아직 멀다"는 뜻이다. */
const FAR_OFF_DAYS = 365;

/**
 * 완성 예상 — 기획 §3.10-4.
 *
 * 목표 단수와 세션 기록이 둘 다 있어야 말이 되는 값이다. 없을 때 추측한
 * 숫자를 채우지 않고 무엇이 없는지 알려준다 — 여기서 거짓 날짜를 보여주면
 * 마감을 그 날짜에 맞춘 사람이 손해를 본다.
 */
export function FinishEstimate({
  projectId,
  remainingRows,
}: {
  projectId: Id;
  remainingRows?: number;
}) {
  const t = useStrings();
  const locale = useLocale();

  const sessions = useLiveQuery(
    () => db.counterSessions.where("projectId").equals(projectId).toArray(),
    [projectId]
  );

  if (!sessions) return null;

  if (remainingRows === undefined) {
    return <Note>{t.finish.needTarget}</Note>;
  }

  const forecast = finishForecast(sessions, remainingRows, new Date());
  if (!forecast) return <Note>{t.finish.needSessions}</Note>;

  return <Estimate forecast={forecast} locale={locale} />;
}

function Estimate({
  forecast,
  locale,
}: {
  forecast: FinishForecast;
  locale: string;
}) {
  const t = useStrings();
  const far = forecast.daysLeft > FAR_OFF_DAYS;

  return (
    <div className="border-line mt-3 border-t pt-3">
      {/* 날짜만 두면 마감일로 읽힌다. 이건 예상이고, 그 차이가 이 앱에서는
          중요하다 — 마감은 사람이 정하고 예상은 기록이 낸다. */}
      <p className="text-text-3 text-micro">{t.finish.title}</p>
      <p className="text-small">
        {far
          ? t.finish.farOff
          : `${t.finish.by.replace(
              "{date}",
              forecast.at.toLocaleDateString(locale, {
                month: "long",
                day: "numeric",
              })
            )} · ${t.finish.days.replace("{n}", String(forecast.daysLeft))}`}
      </p>
      <p className="text-text-3 text-caption mt-1">
        {t.finish.pace.replace("{n}", String(Math.round(forecast.perHour)))}
        {" · "}
        {t.finish.daily.replace("{time}", formatHours(t, forecast.hoursPerDay))}
      </p>
      {forecast.thin && (
        <p className="text-text-3 text-caption mt-1">{t.finish.thin}</p>
      )}
    </div>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="border-line text-text-3 text-caption mt-3 border-t pt-3">
    {children}
  </p>
);
