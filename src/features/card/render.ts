import { cardFileName, coverRect, wrapText } from "@/domain/card";

/**
 * 공유 카드 그리기 — 기획 §13.3.
 *
 * **카드는 늘 밝게 낸다.** 앱은 다크 모드를 쓰지만 카드는 남의 타임라인에
 * 올라가는 종이다 — 어두운 이미지는 흰 배경의 피드에서 구멍처럼 보이고,
 * 같은 작품의 카드가 사람에 따라 다른 색으로 나오면 앱의 얼굴이 흐려진다.
 * 그래서 화면 토큰을 읽어오지 않고 밝은 값을 여기 적어둔다(DESIGN.md와 같은 값).
 * 화면 가독성 때문에 토큰을 손볼 때 카드가 함께 흔들리지 않게 하는 뜻도 있다.
 */
const PAPER = {
  canvas: "#fbfaf9",
  surface: "#ffffff",
  sunken: "#f5f4f2",
  line: "#e9e7e4",
  text: "#1b1a18",
  text2: "#6a6761",
  text3: "#9b978f",
};

/** 4:5 — 세로 피드에서 가장 크게 보이는 비율 */
const WIDTH = 1080;
const HEIGHT = 1350;
const PAD = 72;
const INNER = WIDTH - PAD * 2;

/* 줄 높이 — 글이 차지할 자리를 그리기 전에 재는 데 쓴다 */
const TITLE_LINE = 78;
const SUBTITLE_LINE = 50;
const FACT_ROW = 108;
const NOTE_LINE = 46;
const FACTS_GAP = 40;
const NOTE_GAP = 36;
const IMAGE_GAP = 56;
const FOOTER_SPACE = 60;

/**
 * 그림 자리의 높이 범위.
 *
 * 글이 길면 그림을 줄이고, 짧으면 키운다. **고정 높이로 두면 글이 조용히
 * 잘린다** — 기호 도안 카드에서 범례가 사라지는 일이 실제로 있었고, 겉뜨기가
 * 빈 칸인 도안에서 범례 없는 카드는 남이 읽을 수 없다.
 */
const IMAGE_MIN = 380;
const IMAGE_MAX = 760;
/** 범례·메모는 이보다 길어지면 카드가 아니라 문서다 */
const NOTE_MAX_LINES = 5;

const FONT = "'Pretendard Variable', Pretendard, system-ui, sans-serif";

export interface CardFact {
  label: string;
  value: string;
}

export interface CardSpec {
  title: string;
  subtitle?: string;
  facts?: CardFact[];
  note?: string;
  /** 위쪽 그림. 사진(Blob)이나 이미 그려둔 캔버스(차트)를 받는다. */
  image?: Blob | HTMLCanvasElement;
  /** 그림을 자르지 않고 여백에 맞춰 넣는다 — 차트는 잘리면 무늬가 달라진다 */
  containImage?: boolean;
  footer?: string;
}

/**
 * 카드를 PNG로 그린다.
 *
 * 서체를 **먼저 불러온다.** Pretendard는 필요한 글자만 받아오는 동적 서브셋이라,
 * 카드에만 쓰이는 글자는 아직 없을 수 있다. 기다리지 않으면 시스템 서체로 그려져
 * 화면과 다른 카드가 나온다 — 눈에 잘 안 띄는데 한 번 공유하면 되돌릴 수 없다.
 */
export async function renderCard(spec: CardSpec): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");

  await loadFonts(spec);

  ctx.fillStyle = PAPER.canvas;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textBaseline = "top";

  const plan = layout(ctx, spec);

  let y = PAD;
  if (spec.image) {
    y = await drawImageBox(ctx, spec, y, plan.imageHeight);
    y += IMAGE_GAP;
  }

  y = drawTitle(ctx, plan, y);
  if (plan.facts.length) y = drawFacts(ctx, plan.facts, y + FACTS_GAP);
  if (plan.noteLines.length) drawNote(ctx, plan.noteLines, y + NOTE_GAP);

  drawFooter(ctx, spec.footer);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png"
    );
  });
}

interface Layout {
  titleLines: string[];
  subtitle?: string;
  facts: CardFact[];
  noteLines: string[];
  imageHeight: number;
}

/**
 * 글이 필요한 자리를 먼저 재고, 남은 높이를 그림에 준다.
 *
 * 순서가 중요하다. 그림 높이를 먼저 정하면 글이 넘칠 때 잘라낼 곳이 없어서
 * 조용히 사라진다. 글은 카드의 내용이고 그림은 표지다.
 */
function layout(ctx: CanvasRenderingContext2D, spec: CardSpec): Layout {
  const titleLines = wrapText(
    spec.title,
    INNER,
    measurer(ctx, `700 62px ${FONT}`),
    2
  );
  const subtitle = spec.subtitle
    ? wrapText(spec.subtitle, INNER, measurer(ctx, `500 34px ${FONT}`), 1)[0]
    : undefined;
  const facts = spec.facts ?? [];

  const fixed =
    titleLines.length * TITLE_LINE +
    (subtitle ? SUBTITLE_LINE : 0) +
    (facts.length ? FACTS_GAP + Math.ceil(facts.length / 2) * FACT_ROW : 0);

  // 메모에 줄 수 있는 줄 수는 그림 최소 높이를 지킨 뒤 남는 것이다
  const noteRoom =
    HEIGHT -
    PAD * 2 -
    FOOTER_SPACE -
    fixed -
    (spec.image ? IMAGE_MIN + IMAGE_GAP : 0) -
    NOTE_GAP;
  const noteLines = spec.note
    ? wrapText(
        spec.note,
        INNER,
        measurer(ctx, `400 32px ${FONT}`),
        Math.max(0, Math.min(NOTE_MAX_LINES, Math.floor(noteRoom / NOTE_LINE)))
      )
    : [];

  const textHeight =
    fixed + (noteLines.length ? NOTE_GAP + noteLines.length * NOTE_LINE : 0);
  const room = HEIGHT - PAD * 2 - FOOTER_SPACE - textHeight - IMAGE_GAP;
  const imageHeight = Math.max(IMAGE_MIN, Math.min(IMAGE_MAX, room));

  return { titleLines, subtitle, facts, noteLines, imageHeight };
}

async function loadFonts(spec: CardSpec) {
  const text = [
    spec.title,
    spec.subtitle,
    spec.note,
    spec.footer,
    ...(spec.facts ?? []).flatMap((f) => [f.label, f.value]),
  ]
    .filter(Boolean)
    .join(" ");
  const weights = ["400", "500", "600", "700"];
  await Promise.all(
    weights.map((weight) =>
      document.fonts.load(`${weight} 48px ${FONT}`, text).catch(() => undefined)
    )
  );
  await document.fonts.ready;
}

const measurer = (ctx: CanvasRenderingContext2D, font: string) => {
  ctx.font = font;
  return (text: string) => ctx.measureText(text).width;
};

/** 그림 자리 — 사진은 꽉 채우고, 차트는 잘리지 않게 맞춘다 */
async function drawImageBox(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  top: number,
  boxHeight: number
): Promise<number> {
  const source = await toBitmap(spec.image!);
  if (!source) return top;

  ctx.save();
  roundRect(ctx, PAD, top, INNER, boxHeight, 16);
  ctx.clip();
  ctx.fillStyle = PAPER.sunken;
  ctx.fillRect(PAD, top, INNER, boxHeight);

  if (spec.containImage) {
    // 차트는 자르면 무늬가 달라진다. 여백을 두고 비율을 지켜 넣는다.
    const scale = Math.min(
      (INNER - 48) / source.width,
      (boxHeight - 48) / source.height
    );
    const width = source.width * scale;
    const height = source.height * scale;
    ctx.drawImage(
      source,
      PAD + (INNER - width) / 2,
      top + (boxHeight - height) / 2,
      width,
      height
    );
  } else {
    const crop = coverRect(source.width, source.height, INNER, boxHeight);
    ctx.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      PAD,
      top,
      INNER,
      boxHeight
    );
  }
  ctx.restore();

  ctx.strokeStyle = PAPER.line;
  ctx.lineWidth = 2;
  roundRect(ctx, PAD, top, INNER, boxHeight, 16);
  ctx.stroke();

  return top + boxHeight;
}

async function toBitmap(
  image: Blob | HTMLCanvasElement
): Promise<ImageBitmap | HTMLCanvasElement | null> {
  if (!(image instanceof Blob)) return image;
  try {
    return await createImageBitmap(image, { imageOrientation: "from-image" });
  } catch {
    // 읽을 수 없는 사진이면 그림 없는 카드를 낸다. 카드가 아예 안 나오는 것보다
    // 낫다 — 제목과 수치가 이 카드의 내용이다.
    return null;
  }
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  plan: Layout,
  top: number
): number {
  let y = top;

  ctx.font = `700 62px ${FONT}`;
  ctx.fillStyle = PAPER.text;
  for (const line of plan.titleLines) {
    ctx.fillText(line, PAD, y);
    y += TITLE_LINE;
  }

  if (plan.subtitle) {
    ctx.font = `500 34px ${FONT}`;
    ctx.fillStyle = PAPER.text2;
    ctx.fillText(plan.subtitle, PAD, y + 8);
    y += SUBTITLE_LINE;
  }
  return y;
}

/**
 * 수치는 두 칸으로 늘어놓는다.
 *
 * 카드에서 실제로 읽히는 것이 이 부분이다 — "22코 30단", "4mm", "메리노 3타래"
 * 같은 값은 사진보다 정확한 정보이고, 남이 자기 작업에 옮겨 쓸 수 있는 것이다.
 */
function drawFacts(
  ctx: CanvasRenderingContext2D,
  facts: CardFact[],
  top: number
): number {
  const columns = 2;
  const gap = 32;
  const cellWidth = (INNER - gap) / columns;
  const rowHeight = FACT_ROW;

  facts.forEach((fact, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = PAD + column * (cellWidth + gap);
    const y = top + row * rowHeight;

    const labelFont = `500 28px ${FONT}`;
    ctx.font = labelFont;
    ctx.fillStyle = PAPER.text3;
    ctx.fillText(
      wrapText(fact.label, cellWidth, measurer(ctx, labelFont), 1)[0] ?? "",
      x,
      y
    );

    const valueFont = `600 42px ${FONT}`;
    ctx.font = valueFont;
    ctx.fillStyle = PAPER.text;
    ctx.fillText(
      wrapText(fact.value, cellWidth, measurer(ctx, valueFont), 1)[0] ?? "",
      x,
      y + 38
    );
  });

  return top + Math.ceil(facts.length / columns) * rowHeight;
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  top: number
): void {
  ctx.font = `400 32px ${FONT}`;
  ctx.fillStyle = PAPER.text2;
  lines.forEach((line, index) =>
    ctx.fillText(line, PAD, top + index * NOTE_LINE)
  );
}

/** 서명 — 어디서 만든 카드인지 */
function drawFooter(ctx: CanvasRenderingContext2D, footer?: string): void {
  const y = HEIGHT - PAD - 34;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = PAPER.text3;
  ctx.fillText("knittinglog", PAD, y);

  if (!footer) return;
  ctx.font = `400 30px ${FONT}`;
  const width = ctx.measureText(footer).width;
  ctx.fillText(footer, WIDTH - PAD - width, y);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

export { cardFileName };
