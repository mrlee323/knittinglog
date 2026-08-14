import { createFileRoute } from "@tanstack/react-router";
import { Page, Placeholder } from "@/components/ui/page";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/gauge/")({ component: GaugeIndex });

function GaugeIndex() {
  const t = useStrings();
  return (
    <Page title={t.nav.gauge}>
      <Placeholder note="게이지 기록 목록과 계산기·도안 리사이저가 들어갈 자리입니다. 계산 로직은 src/domain/gauge.ts에 이미 있습니다." />
    </Page>
  );
}
