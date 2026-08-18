/**
 * 사진 축소·압축.
 *
 * 원본을 그대로 IndexedDB에 넣으면 요즘 폰 사진 한 장이 4~8MB다. 진행 사진은
 * 프로젝트당 수십 장이 되고, 저장 한도에 부딪히는 순간 카운터 쓰기까지 함께
 * 실패한다 — 사진 때문에 오프라인 우선의 근간이 흔들린다. 그래서 저장 전에
 * 반드시 여기를 통과시킨다.
 */

/**
 * 긴 변 기준 상한(px).
 *
 * 진행 사진은 "어디까지 떴는지" 확인용이라 인쇄 품질이 필요 없다. 1600px이면
 * 폰 화면에서 전체 보기로 봐도 충분하고, 웹P로 압축하면 장당 150~300KB다.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export interface ShrunkImage {
  blob: Blob;
  width: number;
  height: number;
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * 웹P를 먼저 시도하고 안 되면 JPEG로 떨어진다.
 *
 * toBlob은 지원하지 않는 타입을 주면 에러가 아니라 조용히 PNG를 돌려준다.
 * PNG는 사진에서 웹P의 5~10배가 되므로 타입을 확인해서 걸러낸다.
 */
async function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await encode(canvas, "image/webp");
  if (webp?.type === "image/webp") return webp;

  const jpeg = await encode(canvas, "image/jpeg");
  if (jpeg) return jpeg;

  throw new Error("사진을 변환할 수 없습니다");
}

export async function shrinkImage(file: Blob): Promise<ShrunkImage> {
  // EXIF 회전을 브라우저가 적용해준다. 이걸 빼면 세로로 찍은 사진이 눕는다.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("사진을 변환할 수 없습니다");

  ctx.drawImage(bitmap, 0, 0, width, height);
  // ImageBitmap은 GC가 즉시 회수하지 않는다. 여러 장을 연달아 올리면
  // 닫지 않은 비트맵이 쌓여 저사양 폰에서 탭이 죽는다.
  bitmap.close();

  return { blob: await toBlob(canvas), width, height };
}
