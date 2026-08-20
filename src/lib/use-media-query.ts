import { useSyncExternalStore } from "react";

/**
 * 미디어 쿼리를 읽는다.
 *
 * CSS로 못 하는 경우에만 쓴다 — 화면 크기에 따라 **구조가** 달라질 때다. 뜨기
 * 모드가 세로에서는 위아래로, 가로에서는 좌우로 나뉘는 것이 그 예다. 클래스만
 * 바꾸는 것으로 되는 일에는 Tailwind 변형을 쓰는 게 낫다.
 *
 * effect + setState가 아니라 useSyncExternalStore를 쓴다. 외부 상태 구독이고,
 * 첫 렌더에서 이미 맞는 값을 준다 — effect로 하면 한 프레임 동안 틀린 구조가
 * 그려지고, 분할 화면에서는 그게 눈에 보인다.
 */
const subscribers = new Map<string, (onChange: () => void) => () => void>();

function subscriberFor(query: string) {
  let subscribe = subscribers.get(query);
  if (!subscribe) {
    // 쿼리마다 하나만 만들어 캐시한다. 렌더마다 새 함수를 넘기면
    // useSyncExternalStore가 매번 구독을 끊고 다시 건다.
    subscribe = (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    };
    subscribers.set(query, subscribe);
  }
  return subscribe;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscriberFor(query),
    () => window.matchMedia(query).matches,
    // 서버 렌더는 없지만 안전값을 준다
    () => false
  );
}

/** 도안과 카운터를 좌우로 놓을 만큼 넓은가 */
export const useWideEnough = () => useMediaQuery("(min-width: 900px)");

/**
 * 창이 낮은가.
 *
 * 분할 화면(유튜브를 위에, 우리를 아래에)에서 이 값이 참이 된다. 숫자와 +1
 * 영역을 그대로 두면 버튼이 화면 밖으로 밀린다.
 */
export const useShortViewport = () => useMediaQuery("(max-height: 560px)");
