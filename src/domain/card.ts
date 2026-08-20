/**
 * 공유 카드 계산 — 기획 §13.3.
 *
 * 커뮤니티를 열지 않는 대신 내 프로젝트·게이지·문양을 **이미지 카드로** 내보낸다.
 * 공유는 우리가 만들고 커뮤니티는 남의 플랫폼에 둔다.
 *
 * 그림 그리기는 화면 계층이 하고, 여기는 **자리 계산**만 한다. 줄바꿈과 사진
 * 자르기가 손으로 하면 틀리는 계산이고, 카드는 한 번 만들면 남의 타임라인에
 * 올라가므로 글자가 잘리거나 사진이 늘어나면 되돌릴 수 없다.
 */

/** 글자 폭을 재는 함수. 캔버스가 없는 곳에서도 테스트할 수 있게 주입받는다. */
export type Measure = (text: string) => number;

/**
 * 줄바꿈할 수 있는 자리에서 끊어 여러 줄로 만든다.
 *
 * **한글은 공백이 없어서 단어 단위로 끊을 수 없다.** "래글런소매눈송이요크가디건"을
 * 한 단어로 보면 한 줄이 카드를 넘어간다. 그래서 CJK 글자는 글자마다 끊을 수 있는
 * 자리로 보고, 영문은 단어를 지킨다 — 같은 카드 안에 두 규칙이 함께 산다.
 *
 * `maxLines`를 넘으면 마지막 줄 끝에 줄임표를 붙인다. 카드 높이는 정해져 있으므로
 * 넘치는 글은 그리지 않는 게 아니라 잘렸다는 걸 보여줘야 한다.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: Measure,
  maxLines = Infinity
): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    for (const line of wrapParagraph(paragraph, maxWidth, measure)) {
      lines.push(line);
    }
  }

  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  const last = kept.length - 1;
  kept[last] = truncate(kept[last], maxWidth, measure);
  return kept;
}

const ELLIPSIS = "…";

/**
 * CJK는 글자마다 끊을 수 있다.
 *
 * 한글·한자·가나·전각 부호를 포함한다. 범위를 이스케이프로 적는 이유는 리터럴
 * 글자로 적으면 편집기·터미널에 따라 보이지 않거나 뭉개져서 나중에 고칠 수
 * 없어지기 때문이다.
 */
const CJK =
  /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff\uff00-\uffef]/;

const isCjk = (char: string) => CJK.test(char);

/**
 * 줄 **앞에** 올 수 없는 글자 (한글 조판의 금칙).
 *
 * 닫는 괄호나 가운뎃점으로 줄이 시작하면 글머리표처럼 보이고, 앞 줄과의 관계가
 * 끊겨 읽힌다. 범례를 "겉뜨기 · 바늘비우기 · …"로 이어 적으므로 실제로 만나는
 * 상황이다. 이런 글자는 앞 조각에 붙여 함께 넘긴다.
 */
const NO_BREAK_BEFORE = /^[)\]}»›〉》」』…·,.!?;:%‰°"']$/;

/**
 * 끊을 수 있는 조각으로 나눈다.
 *
 * 조각 하나는 공백 묶음, CJK 글자 하나, 또는 영문 단어다. 이 단위로만 줄이
 * 갈리므로 영문 단어가 중간에서 잘리지 않는다.
 */
function segments(paragraph: string): string[] {
  const out: string[] = [];
  let word = "";
  const flush = () => {
    if (word) out.push(word);
    word = "";
  };

  for (const char of paragraph) {
    if (/\s/.test(char)) {
      flush();
      // 공백은 앞 줄 끝에 붙여 흘려보낸다 — 줄 시작에 공백이 오면 들여쓴 것처럼 보인다
      if (out.length > 0) out[out.length - 1] += char;
      continue;
    }
    if (NO_BREAK_BEFORE.test(char)) {
      // 앞 조각에 붙인다. 붙일 앞이 없으면(문장 첫 글자) 새 조각이 된다.
      flush();
      if (out.length > 0) out[out.length - 1] += char;
      else out.push(char);
      continue;
    }
    if (isCjk(char)) {
      flush();
      out.push(char);
      continue;
    }
    word += char;
  }
  flush();
  return out;
}

function wrapParagraph(
  paragraph: string,
  maxWidth: number,
  measure: Measure
): string[] {
  const lines: string[] = [];
  let line = "";

  for (const piece of segments(paragraph)) {
    const next = line + piece;
    // trimEnd로 재는 이유는 줄 끝 공백이 폭을 먹으면 안 되기 때문이다
    if (line && measure(next.trimEnd()) > maxWidth) {
      lines.push(line.trimEnd());
      line = piece;
    } else {
      line = next;
    }
  }
  if (line.trimEnd()) lines.push(line.trimEnd());
  // 한 조각이 혼자 폭을 넘으면(아주 긴 영문 단어) 그 줄은 넘친 채로 둔다.
  // 글자 단위로 자르면 주소나 실 이름이 알아볼 수 없게 된다.
  return lines.length > 0 ? lines : [paragraph];
}

/** 줄임표를 붙여 폭 안에 넣는다 */
function truncate(line: string, maxWidth: number, measure: Measure): string {
  if (measure(line + ELLIPSIS) <= maxWidth) return line + ELLIPSIS;
  const chars = Array.from(line);
  while (chars.length > 0) {
    chars.pop();
    const candidate = chars.join("").trimEnd() + ELLIPSIS;
    if (measure(candidate) <= maxWidth) return candidate;
  }
  return ELLIPSIS;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 사진을 자리에 꽉 채우도록 잘라낼 원본 영역.
 *
 * CSS의 `object-fit: cover`를 캔버스에서 하는 계산이다. `drawImage`에 원본
 * 전체를 넘기면 사진이 늘어나고, 늘어난 사진은 게이지를 거짓으로 보여준다 —
 * 뜨개 사진에서는 코가 정사각형처럼 보이게 만드는 셈이다.
 */
export function coverRect(
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number
): Rect {
  if (
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    return {
      x: 0,
      y: 0,
      width: Math.max(0, sourceWidth),
      height: Math.max(0, sourceHeight),
    };
  }
  const sourceRatio = sourceWidth / sourceHeight;
  const boxRatio = boxWidth / boxHeight;

  if (sourceRatio > boxRatio) {
    // 원본이 더 넓다 — 좌우를 잘라낸다
    const width = sourceHeight * boxRatio;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }
  // 원본이 더 높다 — 위아래를 잘라낸다
  const height = sourceWidth / boxRatio;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

/**
 * 내려받을 파일 이름.
 *
 * 제목을 그대로 쓰면 슬래시·따옴표 때문에 저장이 실패하거나 이름이 잘린다.
 * 한글은 그대로 둔다 — 파일 이름에 한글을 못 쓰는 환경은 이제 없고, 로마자로
 * 바꾸면 자기 작품을 못 찾는다.
 */
export function cardFileName(title: string, date: Date): string {
  const safe = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  return `${safe || "knittinglog"} ${stamp}.png`;
}
