import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { drainSharedInbox } from "@/features/inspiration/repository";
import { useStrings } from "@/i18n";

export const Route = createFileRoute("/share")({ component: ShareLanding });

/**
 * 공유 대상 착륙 지점.
 *
 * 서비스워커가 공유 내용을 캐시에 넣고 이 주소로 303을 보낸다
 * (public/share-target.js). 여기서 꺼내 보관함에 넣고 곧 보관함으로 넘긴다.
 *
 * 화면이라기보다 통로다. 그래도 빈 화면을 두지 않는 이유는, 공유한 뒤 아무
 * 반응이 없으면 사용자가 다시 공유하기 때문이다.
 */
function ShareLanding() {
  const t = useStrings();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "done" | "empty">("working");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ids = await drainSharedInbox().catch(() => []);
      if (cancelled) return;
      setStatus(ids.length > 0 ? "done" : "empty");
      // 결과를 한 번 보여주고 넘긴다. 곧바로 넘기면 무엇이 들어왔는지 모르고,
      // 안 넘기면 이 통로에 머문다.
      await navigate({
        to: "/inspiration",
        search: { received: ids.length },
        replace: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <Page title={t.inspiration.title}>
      <p className="text-text-2 text-small">
        {status === "empty" ? t.inspiration.receivedNone : t.inspiration.receiving}
      </p>
    </Page>
  );
}
