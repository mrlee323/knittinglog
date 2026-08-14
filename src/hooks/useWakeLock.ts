import { useEffect, useState } from "react";

/**
 * 화면 꺼짐 방지.
 *
 * 뜨는 중에는 손이 실과 바늘에 묶여 있어 화면을 못 만진다. 몇 분마다
 * 화면이 꺼지면 카운터를 누르려고 매번 잠금을 풀어야 한다.
 *
 * 브라우저는 탭이 백그라운드로 가면 잠금을 자동 해제하므로,
 * 다시 돌아왔을 때 재획득해야 한다.
 */
export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setActive(true);
        sentinel.addEventListener("release", () => setActive(false));
      } catch {
        // 배터리 절약 모드 등에서 거부될 수 있다. 카운터 자체는 계속 동작해야 한다.
        setActive(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
      setActive(false);
    };
  }, [enabled]);

  return active;
}

/** 짧은 촉각 피드백. 화면을 안 보고 눌러도 눌렸는지 알 수 있어야 한다. */
export function haptic(pattern: number | number[] = 12) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}
