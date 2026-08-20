/**
 * 코 하나의 명암 스프라이트.
 *
 * **색이 아니라 그늘과 빛만 담는다.** 아래에 실 색을 깔고 이 스프라이트를 얹으면
 * 어떤 색이든 코처럼 보인다 — 색마다 도형을 다시 그릴 필요가 없고, 나중에
 * 디자이너가 그린 것으로 갈아끼우기도 쉽다.
 *
 * 좌표계는 코 하나다: 가로 100, 세로 134(위 단이 아래 단을 덮는 만큼 더 길다).
 * 메리야스 겉면의 한 코는 아래에서 두 가닥이 모이고 위로 벌어지는 V자이고,
 * 실사처럼 보이는 것은 그 형태보다 **골의 그늘**에서 온다 — 코와 코 사이,
 * 두 가닥이 만나는 아래, 단이 겹치는 자리가 어두워야 천으로 읽힌다.
 */

const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 134" width="100" height="134">
  <defs>
    <linearGradient id="leg" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".26"/>
      <stop offset=".45" stop-color="#fff" stop-opacity=".10"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".42"/>
    </linearGradient>
    <linearGradient id="sides" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".38"/>
      <stop offset=".10" stop-color="#000" stop-opacity="0"/>
      <stop offset=".90" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".38"/>
    </linearGradient>
    <radialGradient id="notch" cx="50%" cy="74%" r="26%">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="row" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".42"/>
    </linearGradient>
  </defs>

  <!-- 옆 코와의 사이. 좁고 진하게 — 이 골이 없으면 색면이 이어져 천이 아니다 -->
  <rect x="0" y="0" width="100" height="100" fill="url(#sides)"/>

  <!-- 두 가닥. 아래가 두껍고 위로 갈수록 얇아진다 -->
  <path d="M50 98 C58 78 68 46 72 2 L54 2 C52 40 50 62 50 76 C50 62 48 40 46 2 L28 2 C32 46 42 78 50 98 Z"
        fill="url(#leg)"/>

  <!-- 가닥 위쪽 능선의 빛 -->
  <path d="M50 92 C57 74 65 44 69 6" fill="none" stroke="#fff" stroke-opacity=".30" stroke-width="5" stroke-linecap="round"/>
  <path d="M50 92 C43 74 35 44 31 6" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/>

  <!-- 두 가닥이 만나는 아래의 골 -->
  <rect x="0" y="52" width="100" height="48" fill="url(#notch)"/>

  <!-- 단이 겹치는 자리. 위 단이 아래 단에 드리우는 그림자다 -->
  <rect x="0" y="100" width="100" height="34" fill="url(#row)"/>
</svg>`;

let cached: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement> | null = null;

/**
 * 스프라이트를 이미지로 한 번만 만든다.
 *
 * 캔버스에 그리려면 디코딩이 끝나 있어야 하는데 그건 비동기다. 준비되기 전에
 * 그리는 프레임은 색만 칠하고, 준비되면 다시 그린다 — 빈 화면을 보여주지 않고
 * 색이 먼저 나오는 편이 낫다.
 */
export function stitchSprite(): {
  image: HTMLImageElement | null;
  ready: Promise<HTMLImageElement>;
} {
  if (cached) return { image: cached, ready: Promise.resolve(cached) };

  loading ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      cached = image;
      resolve(image);
    };
    image.onerror = reject;
    // data URL로 넣는다. 별도 파일로 두면 오프라인에서 프리캐시 목록에
    // 얹혀야 하고, 이 스프라이트는 코드와 함께 버전이 움직이는 편이 낫다.
    image.src = `data:image/svg+xml;utf8,${encodeURIComponent(SPRITE)}`;
  });

  return { image: cached, ready: loading };
}
