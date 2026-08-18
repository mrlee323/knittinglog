import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { Page } from "@/components/ui/page";
import { PhotoTimeline } from "@/features/photo/components/photo-timeline";
import { ProjectTabs } from "@/features/project/components/project-tabs";
import { getProject } from "@/features/project/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/projects/$projectId/log")({
  component: ProjectLog,
});

/**
 * 진행 기록 전용 화면.
 *
 * 개요에는 최근 몇 장만 두고 전체는 여기서 쭉 본다. 기록은 스크롤하며 훑는
 * 대상이고, 개요에 다 쌓으면 개요가 다시 세로로 긴 문서가 된다.
 *
 * 폭은 읽기 폭이 아니라 넓은 폭을 쓴다 — 사진이 주인공인 화면이다.
 */
function ProjectLog() {
  const t = useStrings();
  const { projectId } = Route.useParams();
  const project = useLiveQuery(() => getProject(projectId), [projectId]);

  if (!project) return null;

  return (
    <Page wide title={project.name}>
      <Link
        to="/projects"
        className="text-text-2 text-small -mt-2 mb-4 inline-flex items-center gap-1"
      >
        <ChevronLeft size={16} />
        {t.nav.projects}
      </Link>

      <ProjectTabs projectId={projectId} />
      {/* 기록은 넓은 화면에서도 한 단으로 둔다. 시간순 목록을 두 단으로 나누면
          어느 쪽을 먼저 읽어야 하는지 알 수 없다. */}
      <div className="max-w-2xl">
        <PhotoTimeline projectId={projectId} />
      </div>
    </Page>
  );
}
