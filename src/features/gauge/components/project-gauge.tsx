import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listGaugesForProject } from "@/features/gauge/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 이 프로젝트의 게이지.
 *
 * 게이지 계산은 그냥 하기도 하지만 대개 **이 도안이 내 사이즈와 달라서** 한다.
 * 그러면 시작점은 계산기가 아니라 프로젝트여야 한다 — 여기서 들어가면 그
 * 프로젝트의 스와치가 이미 골라져 있고, 결과도 이 프로젝트로 돌아온다.
 *
 * 스와치가 없어도 계산기로 가는 길을 막지 않는다. 도안 게이지만 알아도
 * 리사이징의 절반은 계산되고, 스와치는 그다음에 뜨면 된다.
 */
export function ProjectGauge({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const gauges = useLiveQuery(
    async () => await listGaugesForProject(projectId),
    [projectId]
  );

  if (!gauges) return null;
  const gauge = gauges[0];

  return (
    <section className="border-line mb-6 border-t pt-5">
      <h2 className="mb-2 font-medium">{t.gauge.title}</h2>

      {gauge ? (
        <p className="text-small">
          {t.gauge.summary
            .replace(
              "{sts}",
              String(gauge.blockedStitchesPer10cm ?? gauge.stitchesPer10cm)
            )
            .replace(
              "{rows}",
              String(gauge.blockedRowsPer10cm ?? gauge.rowsPer10cm)
            )}
          {gauge.needleMm && (
            <span className="text-text-2"> · {gauge.needleMm}mm</span>
          )}
        </p>
      ) : (
        <p className="text-text-3 text-small">{t.gauge.empty}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/gauge/calc" search={{ projectId }}>
          <Button variant="secondary">
            <Calculator size={16} aria-hidden />
            {t.gauge.calcForThis}
          </Button>
        </Link>
        {!gauge && (
          <Link to="/gauge/new">
            <Button variant="ghost">{t.gauge.add}</Button>
          </Link>
        )}
      </div>
    </section>
  );
}
