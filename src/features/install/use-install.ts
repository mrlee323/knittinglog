import { useEffect, useState } from "react";

/** Chrome이 beforeinstallprompt와 함께 넘겨주는 이벤트. 표준 타입에 없어서 직접 좁힌다. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallState =
  /** 이미 설치된 앱으로 실행 중 */
  | "installed"
  /** Chrome이 설치 가능으로 판정했고 프롬프트를 띄울 수 있다 */
  | "available"
  /** 조건이 안 맞거나 브라우저가 프롬프트를 지원하지 않는다 */
  | "unavailable";

/**
 * 앱 설치.
 *
 * 브라우저 메뉴에 숨어 있는 "앱 설치"를 앱 안으로 끌어낸다. 메뉴 항목 이름이
 * 브라우저·기기마다 다르고("앱 설치" / "홈 화면에 추가"), 둘은 결과도 다르다 —
 * 앞은 실제 앱으로 설치되고 뒤는 바로가기만 만든다. 사용자가 그 차이를
 * 알아야 할 이유가 없으므로 앱이 직접 프롬프트를 띄운다.
 *
 * 프롬프트를 못 띄우는 경우도 숨기지 않는다. 버튼이 없다는 사실 자체가
 * "이 브라우저에서는 수동으로 해야 한다"는 정보다.
 */
/** 설치된 앱으로 실행 중인지. 렌더 시점에 알 수 있는 값이다. */
function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari는 display-mode 대신 navigator.standalone을 쓴다
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export function useInstall() {
  // effect 안에서 setState하지 않는다. 초기값으로 계산할 수 있는 것을
  // effect로 미루면 첫 렌더가 틀린 상태를 한 번 보여주고 다시 그린다.
  const [state, setState] = useState<InstallState>(() =>
    isStandalone() ? "installed" : "unavailable"
  );
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // 기본 미니 배너를 막고 우리 버튼으로 대체한다
      e.preventDefault();
      setEvent(e as InstallPromptEvent);
      setState("available");
    };
    const onInstalled = () => {
      setState("installed");
      setEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!event) return "unavailable" as const;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // 프롬프트는 한 번 쓰면 재사용할 수 없다
    setEvent(null);
    if (outcome === "accepted") setState("installed");
    else setState("unavailable");
    return outcome;
  }

  return { state, install };
}
