import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareCardSheet } from "@/features/card/components/share-card-sheet";
import type { CardSpec } from "@/features/card/render";
import { useStrings } from "@/i18n";

/**
 * 카드로 공유하기 버튼.
 *
 * 카드 내용을 **누를 때 한 번** 만든다. 렌더마다 새 spec 객체를 받으면 시트가
 * 같은 카드를 계속 다시 그린다 — 차트 카드는 격자를 캔버스에 그리는 일이라
 * 그 값이 눈에 보인다.
 */
export function ShareCardButton({
  build,
  className,
  variant = "secondary",
}: {
  build: () => CardSpec | Promise<CardSpec>;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const t = useStrings();
  const [spec, setSpec] = useState<CardSpec>();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            setSpec(await build());
          } finally {
            setBusy(false);
          }
        }}
      >
        <Share2 size={16} />
        {t.card.open}
      </Button>
      {spec && (
        <ShareCardSheet spec={spec} onClose={() => setSpec(undefined)} />
      )}
    </>
  );
}
