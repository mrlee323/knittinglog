import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstall } from "@/features/install/use-install";
import { useStrings } from "@/i18n";

/**
 * 설치 안내.
 *
 * 설치되면 확인만 보여주고, 설치 가능하면 버튼을, 불가능하면 수동 방법을
 * 알려준다. 세 상태를 다 드러내는 게 중요하다 — 아무것도 안 보이면
 * 사용자는 설치가 원래 안 되는 앱인지 자기가 못 찾는 건지 알 수 없다.
 */
export function InstallCard() {
  const t = useStrings();
  const { state, install } = useInstall();

  return (
    <section className="border-line bg-surface mb-5 rounded-md border p-4">
      <p className="text-micro text-text-3 mb-2">{t.install.title}</p>

      {state === "installed" ? (
        <p className="text-small flex items-center gap-1.5 font-medium">
          <Check size={16} />
          {t.install.installed}
        </p>
      ) : state === "installed-elsewhere" ? (
        <>
          <p className="text-small flex items-center gap-1.5 font-medium">
            <Check size={16} />
            {t.install.alreadyInstalled}
          </p>
          <p className="text-text-2 text-small mt-1.5">
            {t.install.openFromLauncher}
          </p>
        </>
      ) : state === "available" ? (
        <>
          <p className="text-text-2 text-small mb-3">{t.install.hint}</p>
          <Button onClick={() => void install()}>
            <Download size={16} />
            {t.install.action}
          </Button>
        </>
      ) : (
        <>
          <p className="text-text-2 text-small">{t.install.unavailable}</p>
          <p className="text-text-3 text-caption mt-1.5">{t.install.manual}</p>
        </>
      )}
    </section>
  );
}
