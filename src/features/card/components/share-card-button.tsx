import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  compact,
  variant = "secondary",
}: {
  build: () => CardSpec | Promise<CardSpec>;
  className?: string;
  /**
   * 폰에서는 아이콘만(009).
   *
   * 상세 헤더에는 제목과 상태 배지와 관리 메뉴가 같이 선다. 여기에 글자
   * 라벨까지 두면 375px에서 **제목이 세 줄로 접히고** 화면이 34px 내려간다 —
   * 제목이 접힌 만큼 아래가 전부 밀린다. 넓은 화면에서는 라벨이 그대로 뜨고,
   * 좁을 때도 `aria-label`로 이름은 남는다.
   */
  compact?: boolean;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const t = useStrings();
  const [spec, setSpec] = useState<CardSpec>();
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        aria-label={compact ? t.card.open : undefined}
        className={cn(
          className,
          compact && "max-sm:w-11 max-sm:gap-0 max-sm:px-0"
        )}
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
        <span className={cn(compact && "max-sm:sr-only")}>{t.card.open}</span>
      </Button>
      {spec && (
        <ShareCardSheet spec={spec} onClose={() => setSpec(undefined)} />
      )}
    </>
  );
}
