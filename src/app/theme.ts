import { atomWithStorage } from "jotai/utils";
import { useAtomValue } from "jotai";
import { useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "system" | "light" | "dark";

export const themeAtom = atomWithStorage<ThemeMode>(
  "knittinglog:theme",
  "system"
);

/** 밤에 뜨는 사람이 많아 다크 모드는 선택 기능이 아니다 */
export function useApplyTheme() {
  const mode = useAtomValue(themeAtom);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = mode === "dark" || (mode === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (mode !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);
}

/**
 * 지금 다크 모드인지. 캔버스처럼 CSS를 못 읽는 곳에서 다시 그릴 신호로 쓴다.
 *
 * `themeAtom`을 보지 않고 `<html>`의 클래스를 본다 — "시스템 설정 따라가기"일
 * 때는 atom 값이 바뀌지 않은 채로 실제 테마가 바뀌기 때문이다.
 * 외부 상태 구독이므로 effect + setState가 아니라 useSyncExternalStore를 쓴다.
 */
const subscribeDark = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

export const useIsDark = () =>
  useSyncExternalStore(
    subscribeDark,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
