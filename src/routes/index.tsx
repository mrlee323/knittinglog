import { createFileRoute } from "@tanstack/react-router";
import { Page, Placeholder } from "@/components/ui/page";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const t = useStrings();
  return (
    <Page title={t.nav.dashboard}>
      <Placeholder note="진행중 / 잠시멈춤 프로젝트 요약과 최근 활동이 들어갈 자리입니다." />
    </Page>
  );
}
