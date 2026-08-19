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
  /**
   * 이 기호가 **안면 단**에 있을 때 실제로 뜨는 기법.
   *
   * 도안은 겉에서 본 모습으로 그린다. 그래서 안면 단에서는 그려진 기호를
   * 그대로 뜨면 안 된다 — 겉뜨기 기호를 안뜨기로 떠야 겉에서 겉뜨기로 보인다.
   * 방향만 뒤집고 기법을 그대로 내보내면 반만 맞는 도안이 되고, 그건 없는
   * 것보다 나쁘다.
   *
   * **delta는 기호와 같아야 한다.** 안면에서 뜨는 방법이 다를 뿐 먹고 내는
   * 코수는 같기 때문이다(오른코모아 2→1, 안면 오른코모아 2→1). 표가 틀리면
   * 코수 검산이 조용히 통과하므로 테스트로 못 박아둔다.
   */
  ws?: string;
  /**
   * 안면 단에서만 나오는 기법.
   *
   * 도안에는 그려지지 않으므로 기법 선택 목록에 넣지 않는다. 서술형 변환의
   * 결과로만 등장한다.
   */
  wsOnly?: boolean;
}

/**
 * 대바늘 기법.
 *
 * `none`(코 없음)이 특별하다. 줄임이 있는 도안은 단마다 코수가 다른데 격자는
 * 직사각형이므로, 빈 자리를 메우는 칸이 필요하다. 일반 픽셀 에디터에는 없는
 * 개념이고, 이게 없으면 줄임 무늬를 격자로 표현할 수 없다.
 */
const K = "knit" as const;
const ONE = { consumes: 1, produces: 1 };
const DEC2 = { consumes: 2, produces: 1 };
const DEC3 = { consumes: 3, produces: 1 };
const INC = { consumes: 0, produces: 1 };

export const STITCHES: StitchDef[] = [
  /* --- 도안에 그려지는 기호 (겉에서 본 모습) --- */
  { op: "knit", craft: K, delta: ONE, ws: "purl" },
  { op: "purl", craft: K, delta: ONE, ws: "knit" },
  // 걸러뜨기는 안면에서도 걸러뜨기다. 실을 앞/뒤로 두는지는 도안 기호가
  // 겉면에서도 담지 않는 정보이므로, 여기서 잃는 것이 없다.
  { op: "sl", craft: K, delta: ONE, ws: "sl" },
  { op: "yo", craft: K, delta: INC, ws: "yo" },
  { op: "m1l", craft: K, delta: INC, mirror: "m1r", ws: "m1lp" },
  { op: "m1r", craft: K, delta: INC, mirror: "m1l", ws: "m1rp" },
  { op: "kfb", craft: K, delta: { consumes: 1, produces: 2 }, ws: "pfb" },
  // 기울기 대응은 뜨개 자료 기준이다 — 겉면 오른코모아(k2tog)와 같은 방향으로
  // 기울어 보이는 안면 기법은 안면 오른코모아(p2tog)이고, 왼코모아(ssk)는
  // ssp다. 여기가 뒤바뀌면 완성품의 기울기가 반대로 나오는데 코수 검산으로는
  // 잡히지 않는다(delta가 같으므로).
  { op: "k2tog", craft: K, delta: DEC2, mirror: "ssk", ws: "p2tog" },
  { op: "ssk", craft: K, delta: DEC2, mirror: "k2tog", ws: "ssp" },
  { op: "k3tog", craft: K, delta: DEC3, mirror: "sssk", ws: "p3tog" },
  { op: "sssk", craft: K, delta: DEC3, mirror: "k3tog", ws: "sssp" },
  { op: "cdd", craft: K, delta: DEC3, ws: "cddp" },
  { op: "none", craft: K, delta: { consumes: 0, produces: 0 }, ws: "none" },

  /* --- 안면 단에서만 나오는 기법 (도안에 그려지지 않는다) --- */
  { op: "p2tog", craft: K, delta: DEC2, mirror: "ssp", wsOnly: true },
  { op: "ssp", craft: K, delta: DEC2, mirror: "p2tog", wsOnly: true },
  { op: "p3tog", craft: K, delta: DEC3, mirror: "sssp", wsOnly: true },
  { op: "sssp", craft: K, delta: DEC3, mirror: "p3tog", wsOnly: true },
  { op: "cddp", craft: K, delta: DEC3, wsOnly: true },
  { op: "m1lp", craft: K, delta: INC, mirror: "m1rp", wsOnly: true },
  { op: "m1rp", craft: K, delta: INC, mirror: "m1lp", wsOnly: true },
  { op: "pfb", craft: K, delta: { consumes: 1, produces: 2 }, wsOnly: true },

  // 코바늘은 "어디에 뜨는가"(전단의 어느 코·공간)가 필수 정보라 IR 노드에
  // into 슬롯이 추가된다. 격자 심볼 차트는 대바늘 먼저 — 코바늘 도안은
  // 격자가 아니라 방사형·기호 배치라서 렌더러 자체가 다르다.
  { op: "ch", craft: "crochet", delta: { consumes: 0, produces: 1 } },
  { op: "sc", craft: "crochet", delta: ONE },
  { op: "dc", craft: "crochet", delta: ONE },
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

/**
 * 도안에 그릴 수 있는 기법만. 기법 선택 목록이 쓴다.
 *
 * 안면 전용 기법은 뺀다 — 도안은 겉에서 본 모습이므로 안면 기법이 격자에
 * 들어갈 자리가 없다.
 */
export const chartOps = (craft: Craft = "knit") =>
  STITCHES.filter((s) => s.craft === craft && !s.wsOnly).map((s) => s.op);

/**
 * 이 기호를 안면 단에서 실제로 뜨는 기법.
 *
 * 대응이 없으면 기호를 그대로 돌려준다 — 코바늘처럼 이 축이 없는 경우다.
 */
export const workedOnWs = (op: string) => BY_OP.get(op)?.ws ?? op;
