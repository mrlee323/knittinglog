import { atomWithStorage } from "jotai/utils";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

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
