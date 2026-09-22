import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { listPieces } from "@/features/piece/repository";
import { listCounters } from "@/features/counter/repository";
import { listGaugesForProject } from "@/features/gauge/repository";
import { listAllocationsForProject } from "@/features/yarn/repository";
import { listNeedles } from "@/features/needle/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/** 접었다 펼 수 있는 상세 섹션. 순서는 화면에 놓인 순서와 같다. */
export const FILL_KEYS = [
  "piece",
  "counter",
  "gauge",
  "yarn",
  "needle",
] as const;
export type FillKey = (typeof FILL_KEYS)[number];

/**
 * 채우는 길 한 자리(009).
 *
 * 전에는 빈 섹션 다섯이 각자 제목과 빈 상태 문구와 `+`를 들고 세로로 늘어서
 * 있었다. 아무것도 없는 프로젝트에서 그게 616px이었고, 화면은 "이걸 다 해야
 * 한다"는 숙제로 읽혔다 — 007이 홈에서 없앤 그 화면이 상세에 그대로 남아
 * 있었던 셈이다.
 *
 * 섹션은 비면 사라지고, 들어가는 문만 여기 모인다. **줄이 아니라 칩이다** —
 * 다섯을 세로로 쌓으면 다시 목록이 되고, 목록은 순서가 있는 것처럼 보인다.
 * 순서를 말하는 자리는 `StartGuide` 하나여야 한다.
 *
 * **안내가 아니라 입구다.** "왜 이걸 해야 하는지"는 한 번만 말한다(`StartGuide`).
 * 여기 있는 것은 이름과 `+`뿐이고, 누르면 그 섹션이 제자리에서 펼쳐진다 —
 * 다른 화면으로 보내지 않는다.
 *
 * 채울 것이 없으면 통째로 사라진다.
 */
export function FillRow({
  projectId,
  opened,
  onOpen,
}: {
  projectId: Id;
  /** 이미 펼쳐 둔 것. 펼친 섹션은 자기 제목을 갖고 있으므로 칩에서 뺀다. */
  opened: readonly FillKey[];
  onOpen: (key: FillKey) => void;
}) {
  const t = useStrings();

  const pieces = useLiveQuery(() => listPieces(projectId), [projectId]);
  const counters = useLiveQuery(() => listCounters(projectId), [projectId]);
  const gauges = useLiveQuery(
    () => listGaugesForProject(projectId),
    [projectId]
  );
  const allocations = useLiveQuery(
    () => listAllocationsForProject(projectId),
    [projectId]
  );
  const needles = useLiveQuery(() => listNeedles(), []);

  if (!pieces || !counters || !gauges || !allocations || !needles) return null;

  const mine = needles.filter((n) => n.occupiedByProjectId === projectId);

  /* 비었는지 판단하는 식은 각 섹션이 접히는 식과 **같아야 한다.** 어긋나면
     칩은 있는데 눌러도 아무것도 안 펼쳐지거나, 섹션이 접혔는데 칩이 없어서
     들어갈 길이 사라진다. */
  const 빈것: Record<FillKey, boolean> = {
    piece: pieces.length === 0,
    counter: counters.length === 0,
    gauge: gauges.length === 0,
    yarn: allocations.length === 0,
    needle: mine.length === 0,
  };

  const 이름: Record<FillKey, string> = {
    piece: t.piece.title,
    counter: t.counter.title,
    gauge: t.gauge.title,
    yarn: t.allocation.title,
    needle: t.needle.projectTitle,
  };

  const 칩 = FILL_KEYS.filter((k) => 빈것[k] && !opened.includes(k));
  if (칩.length === 0) return null;

  return (
    <section className="border-line mb-6 border-t pt-5">
      <h2 className="text-micro text-text-3 mb-2">{t.project.fillTitle}</h2>
      <ul className="flex flex-wrap gap-2">
        {칩.map((key) => (
          <li key={key}>
            <button
              type="button"
              data-fill={key}
              onClick={() => onOpen(key)}
              className="border-line text-text-2 text-small hover:border-line-strong hover:text-text inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 transition"
            >
              {이름[key]}
              <Plus size={15} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
