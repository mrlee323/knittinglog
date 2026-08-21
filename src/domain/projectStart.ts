/**
 * 새 프로젝트의 다음 걸음.
 *
 * 프로젝트를 만들면 상세 화면으로 간다. 거기에는 빈 상자가 여덟 개 있다 —
 * 조각·카운터·게이지·실·바늘·사진·자료. 각자 자기 빈 상태 문구를 갖고 있지만
 * **무엇을 먼저 하는지는 아무도 말하지 않는다.** 뜨개를 아는 사람은 순서를
 * 이미 알아서 문제가 없고, 모르는 사람은 여기서 멈춘다.
 *
 * 그래서 순서를 계산해 하나만 말한다. 여덟 개를 다 설명하는 것보다 **다음
 * 하나**를 말하는 게 낫다 — 목록은 읽히지 않고, 목록을 읽어도 어디서 시작할지는
 * 여전히 안 정해진다.
 *
 * **막지 않는다.** 게이지 없이 뜨는 것도 실제로 하는 일이고(목도리는 크기가
 * 안 맞아도 목도리다), 도안을 받아 그대로 뜨는 사람은 계산이 필요 없다.
 * 이건 안내지 관문이 아니라서, 여기서 뭐라고 하든 다른 길은 다 열려 있다.
 */

export type ProjectStep = "yarn" | "swatch" | "piece" | "counter" | "ready";

/** 실제로 할 일이 있는 단계. `ready`는 안내를 접는다는 뜻이라 행동이 없다. */
export type ActionableStep = Exclude<ProjectStep, "ready">;

export interface ProjectReadiness {
  /** 이 프로젝트에 실이 배정됐는가 */
  hasYarn: boolean;
  /** 이 프로젝트에 묶인 스와치가 있는가 */
  hasGauge: boolean;
  /** 계획한 조각이 있는가 */
  hasPiece: boolean;
  /** 세기 시작할 카운터가 있는가 */
  hasCounter: boolean;
}

/**
 * 다음 걸음 하나.
 *
 * 순서에는 이유가 있다. 실을 먼저 정해야 스와치를 뜰 수 있고(무슨 실로 뜨는지
 * 모르면 잴 것이 없다), 스와치가 있어야 치수에서 코수가 나오고, 코수가 있어야
 * 카운터에 목표를 넣을 수 있다. 각 단계가 다음 단계의 입력이라 이 순서는
 * 취향이 아니다.
 *
 * 카운터가 있으면 `ready`다 — 세기 시작했으면 안내가 할 일은 끝났다. 화면은
 * 이 값으로 안내를 접는다. 그 뒤로도 띄우면 뜨는 동안 "다음 할 일"이 자리를
 * 차지하는데, 그때 다음 할 일은 뜨는 것이고 그건 이미 큰 버튼으로 있다.
 */
export function nextStep(r: ProjectReadiness): ProjectStep {
  if (r.hasCounter) return "ready";
  if (!r.hasYarn) return "yarn";
  if (!r.hasGauge) return "swatch";
  if (!r.hasPiece) return "piece";
  return "counter";
}

/** 지금까지 몇 단계를 지났나 — 남은 길이 보이면 끝이 있다는 것도 보인다. */
export function stepProgress(r: ProjectReadiness): {
  done: number;
  total: number;
} {
  const flags = [r.hasYarn, r.hasGauge, r.hasPiece, r.hasCounter];
  return { done: flags.filter(Boolean).length, total: flags.length };
}
