/**
 * 기법 심볼 그리기 — 도안 기호를 캔버스에 그린다.
 *
 * 심볼은 뜨개 도안의 국제 공용어에 가깝다. 언어를 몰라도 `/`가 오른쪽으로
 * 기운 줄임이고 `○`가 바늘비우기라는 것은 통한다. 그래서 §4의 IR을 화면에
 * 내보내는 가장 언어 중립적인 경로다 — 서술형이 한·영으로 갈라지는 것과 달리
 * 심볼은 갈라지지 않는다.
 *
 * 관습을 따른다.
 * - **겉뜨기는 빈 칸이다.** 가장 많은 코를 아무것도 그리지 않고 두면 무늬가
 *   되는 코들만 눈에 남는다. 겉뜨기에도 기호를 넣으면 격자가 잉크로 가득 차
 *   무늬가 보이지 않는다.
 * - 기울기는 선의 방향으로 보인다 — `/`와 `\`가 반대 방향 줄임이다.
 * - 코 없음은 칸을 메워 "이 자리에 코가 없다"를 보여준다.
 */

export interface SymbolInk {
  /** 심볼 선 색 */
  ink: string;
  /** 코 없음 칸을 메우는 색 */
  muted: string;
}

/**
 * 칸 하나에 기법을 그린다. 좌표는 칸의 왼쪽 위 화면 좌표다.
 *
 * 아는 기법이 아니면 아무것도 그리지 않는다 — 물음표 같은 표시를 넣으면
 * 겉뜨기(빈 칸)와 구별되지 않으면서 격자만 어지럽다.
 */
export function drawSymbol(
  ctx: CanvasRenderingContext2D,
  op: string,
  left: number,
  top: number,
  w: number,
  h: number,
  colors: SymbolInk
) {
  if (op === "knit") return; // 빈 칸이 겉뜨기다

  if (op === "none") {
    ctx.fillStyle = colors.muted;
    ctx.fillRect(left, top, Math.ceil(w), Math.ceil(h));
    return;
  }

  const pad = Math.min(w, h) * 0.22;
  const x0 = left + pad;
  const x1 = left + w - pad;
  const y0 = top + pad;
  const y1 = top + h - pad;
  const cx = left + w / 2;
  const cy = top + h / 2;

  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = Math.max(1, Math.min(w, h) / 11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  switch (op) {
    case "purl":
      // 가로 막대 — 겉뜨기(빈 칸)와 한눈에 갈린다
      ctx.moveTo(x0, cy);
      ctx.lineTo(x1, cy);
      break;

    case "sl":
      // 아래로 향한 V — 코를 뜨지 않고 옮긴다
      ctx.moveTo(x0, y0);
      ctx.lineTo(cx, y1);
      ctx.lineTo(x1, y0);
      break;

    case "yo":
      // 동그라미 — 코가 아니라 구멍이라는 뜻이다
      ctx.arc(cx, cy, Math.min(w, h) * 0.26, 0, Math.PI * 2);
      break;

    case "k2tog":
      // 오른쪽으로 기운 줄임
      ctx.moveTo(x0, y1);
      ctx.lineTo(x1, y0);
      break;

    case "ssk":
      // 왼쪽으로 기운 줄임 — k2tog의 거울상
      ctx.moveTo(x1, y1);
      ctx.lineTo(x0, y0);
      break;

    case "k3tog":
      // 2코 줄임에 눈금 하나를 더해 3코임을 표시한다
      ctx.moveTo(x0, y1);
      ctx.lineTo(x1, y0);
      tick(ctx, cx, cy, w, h);
      break;

    case "sssk":
      ctx.moveTo(x1, y1);
      ctx.lineTo(x0, y0);
      tick(ctx, cx, cy, w, h);
      break;

    case "cdd":
      // 위로 향한 봉우리 — 가운데 코가 위에 남는 대칭 줄임
      ctx.moveTo(x0, y1);
      ctx.lineTo(cx, y0);
      ctx.lineTo(x1, y1);
      break;

    case "m1l":
      // 세로 막대에 왼쪽 발 — 기운 방향을 발이 가리킨다
      ctx.moveTo(cx, y1);
      ctx.lineTo(cx, y0);
      ctx.moveTo(cx, y1);
      ctx.lineTo(x0, y1);
      break;

    case "m1r":
      ctx.moveTo(cx, y1);
      ctx.lineTo(cx, y0);
      ctx.moveTo(cx, y1);
      ctx.lineTo(x1, y1);
      break;

    case "kfb":
      // 한 뿌리에서 둘로 갈라진다 — 한 코에서 두 코가 나온다
      ctx.moveTo(cx, y1);
      ctx.lineTo(cx, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x0, y0);
      ctx.moveTo(cx, cy);
      ctx.lineTo(x1, y0);
      break;

    default:
      return; // 모르는 기법은 비워둔다
  }

  ctx.stroke();
}

/**
 * 3코 줄임을 2코 줄임과 구별하는 짧은 눈금.
 *
 * **가로여야 한다.** 처음엔 기울기 반대 방향의 짧은 대각선을 그었는데, 그러면
 * `/`+`\\`와 `\\`+`/`가 둘 다 X가 되어 오른코 3모아와 왼코 3모아를 구별할 수
 * 없었다. 기울기를 오독하면 반대로 기운 무늬가 나온다. 가로 눈금은 좌우
 * 대칭이라 어느 기울기와도 다투지 않는다.
 */
function tick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number
) {
  const r = Math.min(w, h) * 0.18;
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
}

/**
 * 캔버스가 놓인 자리에서 실제 색을 읽는다.
 *
 * 캔버스는 CSS 변수를 모르므로 계산된 값을 꺼내와야 한다. 하드코딩하면
 * 다크 모드에서 검은 배경에 검은 선이 된다 — 밤에 뜨는 사람에게는 화면이
 * 비어 보인다.
 */
export function resolveInk(el: Element): SymbolInk {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    ink: pick("--color-text", "#2b2a28"),
    muted: pick("--color-line", "#e5e2dc"),
  };
}
