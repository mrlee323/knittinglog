import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Page } from "@/components/ui/page";
import { drainSharedInbox } from "@/features/share/inbox";
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
      const result = await drainSharedInbox().catch(() => null);
      if (cancelled) return;
      const scraps = result?.scraps.length ?? 0;
      const patterns = result?.patterns.length ?? 0;
      setStatus(scraps + patterns > 0 ? "done" : "empty");

      // 받은 것이 있는 자리로 보낸다. 도안이 왔으면 도안 목록이 맞다 — 스크랩으로
      // 보내면 방금 받은 도안이 거기 없어서 공유가 실패한 것처럼 보인다.
      if (patterns > 0) {
        await navigate({ to: "/patterns", replace: true });
        return;
      }
      await navigate({
        to: "/inspiration",
        search: { received: scraps },
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
        {status === "empty"
          ? t.inspiration.receivedNone
          : t.inspiration.receiving}
      </p>
    </Page>
  );
}
