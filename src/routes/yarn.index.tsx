import { createFileRoute } from "@tanstack/react-router";
import { Page, Placeholder } from "@/components/ui/page";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/yarn/")({ component: YarnIndex });

function YarnIndex() {
  const t = useStrings();
  return (
    <Page title={t.nav.yarn}>
      <Placeholder note="실 스태시 목록이 들어갈 자리입니다." />
    </Page>
  );
}
