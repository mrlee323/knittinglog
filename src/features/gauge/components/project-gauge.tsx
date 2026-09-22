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
export function ProjectGauge({
  projectId,
  open,
}: {
  projectId: Id;
  /** `FillRow`에서 펼쳤나. 비어 있어도 이때는 그린다(009). */
  open?: boolean;
}) {
  const t = useStrings();
  const gauges = useLiveQuery(
    async () => await listGaugesForProject(projectId),
    [projectId]
  );

  if (!gauges) return null;
  const gauge = gauges[0];

  /*
    비어 있으면 그리지 않는다(009).
  
    이 섹션이 자기 빈 상태를 스스로 말하면 빈 프로젝트에서 "없어요"가 다섯 번
    반복되고, 상세가 두 화면 반이 된다. 채우는 길은 사라지지 않고 `FillRow`
    한 자리로 모인다 — 거기서 `open`이 켜지면 이 자리에서 그대로 펼쳐진다.
  */
  if (!gauge && !open) return null;

  return (
    <section
      // 009의 관문이 잡는 손잡이. 없어지면 관문이 조용히 통과하는 게 아니라
      // 환경 문제(2)로 멈춘다.
      data-section="gauge"
      className="border-line mb-6 border-t pt-5"
    >
      <h2 className="text-subhead mb-2 font-medium">{t.gauge.title}</h2>

      {gauge ? (
        /* 게이지 숫자는 이 섹션의 전부다. 본문보다 작게 두면 "내 게이지가
           뭐였지"의 답이 설명문처럼 읽힌다(010). */
        <p className="text-subhead">
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
