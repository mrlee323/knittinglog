import { Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { CornerDownRight } from "lucide-react";
import { getProject } from "@/features/project/repository";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 이어받은 표시.
 *
 * 같은 작품을 다시 뜰 때 카운터와 게이지는 복사되지만, 사진·메모·완성 치수는
 * 지난 작품에 남아 있다. 그래서 여기서 건너갈 수 있어야 한다 — 두 번째로 뜨는
 * 사람이 가장 자주 확인하는 게 "지난번엔 어떻게 했지"다.
 */
export function DerivedFrom({ sourceId }: { sourceId: Id }) {
  const t = useStrings();
  const source = useLiveQuery(() => getProject(sourceId), [sourceId]);

  // 지난 작품을 지웠으면 아무것도 알리지 않는다. 갈 곳 없는 링크를 남기는
  // 것보다 조용한 게 낫다.
  if (!source) return null;

  return (
    <div className="border-line bg-sunken mb-5 rounded-md border p-4">
      <p className="text-small flex items-start gap-1.5">
        <CornerDownRight
          size={14}
          className="text-text-3 mt-1.5 shrink-0"
          aria-hidden
        />
        {t.project.derivedFrom.replace("{name}", source.name)}
      </p>
      <p className="text-text-2 text-caption mt-1">{t.project.derivedHint}</p>
      <Link
        to="/projects/$projectId"
        params={{ projectId: sourceId }}
        className="text-text-2 text-caption hover:text-text mt-1 inline-flex min-h-11 items-center underline"
      >
        {t.project.viewSource}
      </Link>
    </div>
  );
}
