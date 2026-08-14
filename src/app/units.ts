import { useAtomValue } from "jotai";
import { unitSystemAtom } from "./preferences";
import { cmToInch, inchToCm } from "@/domain/units";

/**
 * 표시 단위 변환.
 *
 * **저장은 언제나 cm이다.** 사용자가 인치로 보고 인치로 입력하더라도
 * DB에는 cm으로 들어간다. 그래야 단위계를 바꿔도 데이터가 그대로 있고,
 * 도안 리사이징 같은 계산이 단위를 신경 쓰지 않아도 된다.
 *
 * 게이지의 "10cm당 코수"는 환산하지 않는다. 그건 길이가 아니라
 * 정해진 규격이고, 인치권에서는 4인치(≈10.16cm) 기준을 따로 쓴다.
 * 둘을 섞으면 값이 미묘하게 틀어지므로 게이지 환산은 별도 과제로 둔다.
 */
export function useUnits() {
  const system = useAtomValue(unitSystemAtom);
  const metric = system === "metric";

  return {
    system,
    lengthLabel: metric ? "cm" : "in",

    /** 저장값(cm) → 표시값 */
    fromCm: (cm: number) => (metric ? cm : cmToInch(cm)),

    /** 입력값 → 저장값(cm) */
    toCm: (value: number) => (metric ? value : inchToCm(value)),

    /** 표시용 문자열. 인치는 소수점이 필요하고 cm은 대개 정수로 충분하다. */
    formatLength: (cm: number, digits?: number) => {
      const value = metric ? cm : cmToInch(cm);
      const decimals = digits ?? (metric ? 1 : 2);
      // 정수면 소수점을 붙이지 않는다 — 96cm 이 96.0cm 로 보이면 지저분하다
      const rounded = Number(value.toFixed(decimals));
      return `${rounded}${metric ? "cm" : "in"}`;
    },
  };
}
