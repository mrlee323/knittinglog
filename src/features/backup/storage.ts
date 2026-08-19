/**
 * 저장 공간과 영속성.
 *
 * 로컬 전용 앱에서 이건 배경 기능이 아니다. 두 가지가 조용히 기록을 삼킬 수 있다.
 *
 * 1. **브라우저가 데이터를 스스로 지운다.** 저장 공간이 부족하면 origin의 데이터를
 *    evict할 수 있고, `navigator.storage.persist()`를 받아두지 않으면 우리가 그
 *    대상이다. 사용자는 아무것도 하지 않았는데 기록이 사라진다.
 * 2. **쓰기가 조용히 실패한다.** 쿼터를 넘기면 IndexedDB가 던지는데, 잡아서
 *    알리지 않으면 사진을 올린 줄 알고 넘어간다.
 */

/**
 * 데이터를 지우지 말아달라고 요청한다.
 *
 * 브라우저마다 판단이 다르다 — Chrome은 설치·방문 빈도 같은 신호를 보고 조용히
 * 허락하거나 거절하고, Firefox는 사용자에게 묻는다. 거절되어도 앱은 그대로
 * 동작하므로 실패를 오류로 다루지 않는다.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isPersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export async function estimateStorage(): Promise<{
  usage?: number;
  quota?: number;
}> {
  if (!navigator.storage?.estimate) return {};
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return {};
  }
}

/**
 * 저장 공간이 없어서 실패한 것인지.
 *
 * 브라우저마다 이름이 다르다. 이걸 구별해야 "저장 공간이 부족해요"와 "뭔가
 * 잘못됐어요"를 가려 말할 수 있고, 앞쪽은 사용자가 손쓸 수 있는 문제다.
 */
export function isQuotaError(cause: unknown): boolean {
  const name = (cause as { name?: string })?.name;
  if (name === "QuotaExceededError") return true;
  // Firefox의 옛 이름, Dexie가 감싼 경우
  if (name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const message = String((cause as { message?: string })?.message ?? "");
  return /quota|storage is full|저장 공간/i.test(message);
}
