import { useStrings } from "@/i18n";
import type { MeasurementKey } from "@/domain/body";

/**
 * 치수 도식.
 *
 * "가슴둘레"라는 이름만으로는 어디를 재야 하는지 알 수 없다. 겨드랑이 아래인지
 * 가장 굴곡진 곳인지에 따라 5cm가 달라지고, 그 5cm가 스웨터의 핏을 바꾼다.
 * 그래서 이름 옆에 그림과 문장을 함께 둔다 — 재는 자리를 선으로, 재는 방법을
 * 한 줄로.
 *
 * 사람 모양은 최소한으로 그린다. 이 그림의 목적은 인체 묘사가 아니라 **선이
 * 어디에 걸리는지**이고, 세부가 늘어나면 정작 그 선이 묻힌다. 그래서 몸은
 * 흐린 윤곽으로만 두고 재는 선 하나만 먹색으로 강조한다(docs/DESIGN.md —
 * 화면에서 채도를 갖는 건 사진과 실뿐이다).
 */
export function BodyDiagram({ highlight }: { highlight: MeasurementKey }) {
  const t = useStrings();

  return (
    <figure className="border-line bg-surface rounded-md border p-3">
      <svg
        viewBox="0 0 200 340"
        role="img"
        aria-label={`${t.profile.measure[highlight]} — ${t.profile.measureHint[highlight]}`}
        className="mx-auto h-auto w-full max-w-[13rem]"
      >
        {/* 몸 윤곽 — 읽는 대상이 아니라 배경이다.
            팔은 몸통에서 확실히 떨어뜨린다. 붙여 그리면 실루엣이 한 덩어리가
            되어 "위팔둘레"를 어디서 재는지 보이지 않는다. */}
        <g
          className="text-line-strong"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <circle cx={100} cy={32} r={19} />
          <path d="M93 50v12M107 50v12" />

          {/* 몸통: 어깨 → 가슴 → 허리 → 엉덩이 */}
          <path d="M66 66 C63 78 62 88 62 96 C64 114 72 126 72 138 C69 152 65 164 64 176 C70 186 78 192 88 196" />
          <path d="M134 66 C137 78 138 88 138 96 C136 114 128 126 128 138 C131 152 135 164 136 176 C130 186 122 192 112 196" />
          <path d="M66 66h68" />

          {/* 팔 — 어깨에서 벌어져 손목까지 */}
          <path d="M68 68 C58 82 51 96 49 110 C46 132 44 150 43 162" />
          <path d="M132 68 C142 82 149 96 151 110 C154 132 156 150 157 162" />
          <path d="M43 162c-3 6-2 10 2 10s5-4 4-10z" />
          <path d="M157 162c3 6 2 10-2 10s-5-4-4-10z" />

          {/* 다리 */}
          <path d="M88 196 C88 230 90 266 90 298" />
          <path d="M112 196 C112 230 110 266 110 298" />
          <path d="M64 176 C66 214 70 258 72 298" />
          <path d="M136 176 C134 214 130 258 128 298" />

          {/* 발 */}
          <path d="M72 298h-8c-2 7 0 10 4 10h18c2 0 3-4 2-10z" />
          <path d="M128 298h8c2 7 0 10-4 10h-18c-2 0-3-4-2-10z" />
        </g>

        {/* 재는 자리 */}
        <g
          className="text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <Overlay highlight={highlight} />
        </g>
      </svg>

      <figcaption className="mt-2">
        <p className="text-small font-medium">{t.profile.measure[highlight]}</p>
        <p className="text-text-2 text-caption mt-0.5">
          {t.profile.measureHint[highlight]}
        </p>
      </figcaption>
    </figure>
  );
}

/**
 * 둘레는 점선 타원, 길이는 실선과 양끝 눈금으로 그린다.
 *
   둘 다 직선으로 그리면 "가슴둘레"를 앞폭으로 재는 오해가 생긴다. 몸을 감아
 * 도는 치수라는 걸 그림이 말해줘야 한다.
 */
function Overlay({ highlight }: { highlight: MeasurementKey }) {
  switch (highlight) {
    case "bust":
      return <Girth cx={100} cy={96} rx={40} ry={9} />;
    case "waist":
      return <Girth cx={100} cy={138} rx={30} ry={7} />;
    case "hip":
      return <Girth cx={100} cy={176} rx={38} ry={9} />;
    case "shoulder":
      return <Span x1={66} y1={66} x2={134} y2={66} />;
    case "armLength":
      return (
        <>
          <path d="M68 68 C58 82 51 96 49 110 C46 132 44 150 43 162" />
          <path d="M62 62v10M36 162h13" />
        </>
      );
    case "upperArm":
      return <Girth cx={53} cy={100} rx={10} ry={4} />;
    // 등길이는 몸 밖에 세로로 그린다. 몸 위에 겹치면 척추선처럼 보인다.
    case "backLength":
      return <Span x1={166} y1={62} x2={166} y2={138} vertical />;
    case "headCirc":
      return <Girth cx={100} cy={28} rx={22} ry={9} />;
    case "footLength":
      return <Span x1={64} y1={320} x2={90} y2={320} />;
    case "footCirc":
      return <Girth cx={77} cy={304} rx={13} ry={4} />;
  }
}

/** 몸을 감아 도는 치수 */
function Girth({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  return (
    <>
      {/* 뒤로 돌아가는 쪽은 점선 — 안 보이는 면이라는 뜻이다 */}
      <path
        d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`}
        strokeDasharray="4 3"
      />
      <path d={`M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`} />
    </>
  );
}

/** 두 점 사이의 길이 */
function Span({
  x1,
  y1,
  x2,
  y2,
  vertical,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vertical?: boolean;
}) {
  const tick = 5;
  return (
    <>
      <path d={`M${x1} ${y1}L${x2} ${y2}`} />
      {vertical ? (
        <path
          d={`M${x1 - tick} ${y1}h${tick * 2}M${x2 - tick} ${y2}h${tick * 2}`}
        />
      ) : (
        <path
          d={`M${x1} ${y1 - tick}v${tick * 2}M${x2} ${y2 - tick}v${tick * 2}`}
        />
      )}
    </>
  );
}
