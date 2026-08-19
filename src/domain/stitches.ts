/**
 * 기법(op) 표 — 언어 중립 IR의 뼈대(기획 §4).
 *
 * **도메인이 이 표를 소유한다.** 코수 변화(delta)는 계산이고 번역이 아니다.
 * i18n은 op에 붙는 이름만 갖는다(src/i18n/stitches). 이 둘을 한 파일에 두면
 * 언어를 추가할 때 계산 표를 건드리게 되고, 그 반대도 마찬가지다.
 *
 * delta가 이 표의 핵심이다. 이것만 있으면 도안의 코수를 자동으로 검산할 수
 * 있고(§4), 오탈자로 몇 시간을 날리는 일을 막는다.
 */

export type Craft = "knit" | "crochet";

export interface StitchDelta {
  /** 전단에서 소비하는 코수 */
  consumes: number;
  /** 이번 단에 만들어내는 코수 */
  produces: number;
}

export interface StitchDef {
  op: string;
  craft: Craft;
  delta: StitchDelta;
  /**
   * 좌우 반전했을 때 대응되는 op.
   *
   * 기울기가 있는 코는 그림만 뒤집으면 안 된다 — 오른코모아(k2tog)를 뒤집으면
   * 왼코모아(ssk)가 되어야 하고, 픽셀만 뒤집으면 기울기가 반대인 도안이 된다.
   * 대칭인 코는 자기 자신을 가리킨다.
   */
  mirror?: string;
}

/**
 * 대바늘 기법.
 *
 * `none`(코 없음)이 특별하다. 줄임이 있는 도안은 단마다 코수가 다른데 격자는
 * 직사각형이므로, 빈 자리를 메우는 칸이 필요하다. 일반 픽셀 에디터에는 없는
 * 개념이고, 이게 없으면 줄임 무늬를 격자로 표현할 수 없다.
 */
export const STITCHES: StitchDef[] = [
  { op: "knit", craft: "knit", delta: { consumes: 1, produces: 1 } },
  { op: "purl", craft: "knit", delta: { consumes: 1, produces: 1 } },
  { op: "sl", craft: "knit", delta: { consumes: 1, produces: 1 } },
  { op: "yo", craft: "knit", delta: { consumes: 0, produces: 1 } },
  { op: "m1l", craft: "knit", delta: { consumes: 0, produces: 1 }, mirror: "m1r" },
  { op: "m1r", craft: "knit", delta: { consumes: 0, produces: 1 }, mirror: "m1l" },
  { op: "kfb", craft: "knit", delta: { consumes: 1, produces: 2 } },
  { op: "k2tog", craft: "knit", delta: { consumes: 2, produces: 1 }, mirror: "ssk" },
  { op: "ssk", craft: "knit", delta: { consumes: 2, produces: 1 }, mirror: "k2tog" },
  { op: "k3tog", craft: "knit", delta: { consumes: 3, produces: 1 }, mirror: "sssk" },
  { op: "sssk", craft: "knit", delta: { consumes: 3, produces: 1 }, mirror: "k3tog" },
  { op: "cdd", craft: "knit", delta: { consumes: 3, produces: 1 } },
  { op: "none", craft: "knit", delta: { consumes: 0, produces: 0 } },

  // 코바늘은 "어디에 뜨는가"(전단의 어느 코·공간)가 필수 정보라 IR 노드에
  // into 슬롯이 추가된다. 격자 심볼 차트는 대바늘 먼저 — 코바늘 도안은
  // 격자가 아니라 방사형·기호 배치라서 렌더러 자체가 다르다.
  { op: "ch", craft: "crochet", delta: { consumes: 0, produces: 1 } },
  { op: "sc", craft: "crochet", delta: { consumes: 1, produces: 1 } },
  { op: "dc", craft: "crochet", delta: { consumes: 1, produces: 1 } },
];

const BY_OP = new Map(STITCHES.map((s) => [s.op, s]));

export const findStitch = (op: string) => BY_OP.get(op);

export function stitchDelta(op: string): StitchDelta {
  // 모르는 op은 코수를 바꾸지 않는 것으로 본다. 검산이 모르는 기호 하나 때문에
  // 통째로 틀리기보다, 그 칸만 셈에서 빠지는 편이 낫다.
  return BY_OP.get(op)?.delta ?? { consumes: 0, produces: 0 };
}

/** 좌우 반전 시 바뀌어야 하는 op. 대칭인 코는 자기 자신. */
export const mirrorOp = (op: string) => BY_OP.get(op)?.mirror ?? op;

export const stitchOps = (craft: Craft = "knit") =>
  STITCHES.filter((s) => s.craft === craft).map((s) => s.op);
