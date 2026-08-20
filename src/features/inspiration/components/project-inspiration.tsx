import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Sparkles } from "lucide-react";
import { InspirationImage } from "@/features/inspiration/components/inspiration-image";
import { listInspirationsForProject } from "@/features/inspiration/repository";
import { sourceHost } from "@/domain/shared";
import { useStrings } from "@/i18n";
import type { Id } from "@/types/entities";

/**
 * 이 작품에 붙인 스크랩 — 기획 §13.2가 말한 "상세 화면이 무드보드가 된다".
 *
 * 작업대의 뷰어에 넣지 않고 따로 띄운다. 작업대는 **뜨는 동안 보는 것**을
 * 놓는 자리이고(도안·영상), 스크랩은 뜨기 전에 모은 것이라 성격이 다르다.
 * 임의의 사이트는 앱 안에서 열 수도 없으므로 뷰어에 넣으면 눌러도 아무 일이
 * 없는 항목이 트레이에 섞인다.
 */
export function ProjectInspiration({ projectId }: { projectId: Id }) {
  const t = useStrings();
  const items = useLiveQuery(
    () => listInspirationsForProject(projectId),
    [projectId]
  );

  // 붙인 것이 없으면 자리를 차지하지 않는다. 보관함으로 가는 길은 홈에 있다.
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={14} className="text-text-3" aria-hidden />
        <h2 className="text-micro text-text-3">
          {t.inspiration.projectSection}
        </h2>
        <Link
          to="/inspiration"
          search={{ received: 0 }}
          className="text-text-3 text-caption ml-auto underline"
        >
          {t.inspiration.open}
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="border-line bg-surface flex flex-col gap-1.5 rounded-md border p-2"
          >
            {item.blob && (
              <div className="bg-sunken overflow-hidden rounded-sm">
                <InspirationImage
                  item={item}
                  className="aspect-square w-full object-cover"
                />
              </div>
            )}
            {item.title && (
              <p className="text-caption font-medium break-words">
                {item.title}
              </p>
            )}
            {item.note && (
              <p className="text-text-2 text-micro line-clamp-3 break-words">
                {item.note}
              </p>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-text-3 text-micro mt-auto inline-flex items-center gap-1 underline"
              >
                <ExternalLink size={11} aria-hidden />
                {sourceHost(item.sourceUrl) ?? t.inspiration.openExternal}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
