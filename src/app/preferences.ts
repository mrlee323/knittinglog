import { atomWithStorage } from "jotai/utils";
import type { UnitSystem } from "@/domain/units";

/**
 * 단위계. 해외 도안을 다루는 서비스라 전역 전환이 필요하다.
 * 저장은 항상 metric(cm/g/m)으로 하고 표시할 때만 환산한다.
 */
export const unitSystemAtom = atomWithStorage<UnitSystem>(
  "knittinglog:units",
  "metric"
);
