import { createFileRoute } from "@tanstack/react-router";
import { Page, Placeholder } from "@/components/ui/page";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/projects/")({ component: Projects });

function Projects() {
  const t = useStrings();
  return (
    <Page title={t.nav.projects}>
      <Placeholder note="상태별 필터와 프로젝트 카드 그리드가 들어갈 자리입니다." />
    </Page>
  );
}
