import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** docs/DESIGN.md §3 의 타입 스케일 */
const FONT_SIZES = [
  "micro",
  "caption",
  "small",
  "body",
  "subhead",
  "heading",
  "title",
  "display",
];

/**
 * tailwind-merge에 우리 스케일을 알려준다.
 *
 * 알려주지 않으면 `text-micro`를 글자 크기가 아니라 글자 색으로 분류하고,
 * 같은 문자열 뒤에 오는 `text-hibernating` 같은 색 클래스가 크기 클래스를
 * 지워버린다. 에러도 경고도 없이 타이포그래피만 조용히 무너지는 버그라
 * 반드시 여기서 막아야 한다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
