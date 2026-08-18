import { useEffect, useRef } from "react";

/**
 * Blob 사진을 <img>에 물린다.
 *
 * objectURL의 생성과 해제를 **같은 이펙트 안에** 둔다. 이게 이 훅의 존재
 * 이유다. URL을 렌더에서 만들고 해제만 이펙트에서 하면, 이펙트가 다시
 * 실행될 때(StrictMode의 마운트 재현, 리스트 재정렬) 해제된 URL을 그대로
 * 쓰게 되고 사진이 조용히 빈 칸으로 나온다 — 에러도 없이.
 *
 * 반환값을 상태로 두지 않는 이유는 렌더 횟수다. 사진마다 setState가 붙으면
 * 열두 장짜리 타임라인이 열릴 때 렌더가 스물네 번 돈다.
 *
 * data URL로 바꾸지 않는 이유는 base64가 원본보다 33% 크고, 문자열로
 * 만드는 동안 메인 스레드를 잡기 때문이다.
 */
export function useBlobImage(blob?: Blob) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !blob) return;

    const url = URL.createObjectURL(blob);
    el.src = url;

    return () => {
      // 해제 전에 src를 떼어낸다. 붙인 채로 해제하면 브라우저가 이미
      // 그려둔 그림은 남기지만, 그 사이 다시 로드가 걸리면 깨진 이미지가 된다.
      el.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  return ref;
}
