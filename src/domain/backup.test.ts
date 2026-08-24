import { describe, expect, it } from "vitest";
import {
  BACKUP_APP,
  BACKUP_FORMAT,
  backupFileName,
  checkBackup,
  decodeRecord,
  encodeRecord,
  formatBytes,
  planImport,
  storageLevel,
  type BackupFile,
  type TaggedBlob,
} from "./backup";

/** 도메인은 브라우저를 모른다 — 인코더를 주입해 테스트한다 */
const encodeBlob = async (blob: Blob): Promise<TaggedBlob> => ({
  __t: "blob",
  type: blob.type,
  data: `fake:${blob.size}`,
});
const decodeBlob = (tagged: TaggedBlob) =>
  new Blob([tagged.data], { type: tagged.type });

const keep = (value: unknown) => encodeRecord(value, encodeBlob, true);
const drop = (value: unknown) => encodeRecord(value, encodeBlob, false);

describe("값 변환", () => {
  it("날짜에 태그를 붙인다 — JSON.parse는 되돌리지 못한다", async () => {
    const at = new Date("2026-08-19T01:02:03.000Z");
    expect(await keep({ createdAt: at })).toEqual({
      createdAt: { __t: "date", iso: "2026-08-19T01:02:03.000Z" },
    });
  });

  it("왕복하면 날짜가 날짜로 돌아온다", async () => {
    const at = new Date("2026-08-19T01:02:03.000Z");
    const round = decodeRecord(
      JSON.parse(JSON.stringify(await keep({ at }))),
      decodeBlob
    ) as { at: Date };
    expect(round.at).toBeInstanceOf(Date);
    expect(round.at.getTime()).toBe(at.getTime());
  });

  it("Blob에 태그를 붙인다", async () => {
    const blob = new Blob(["hello"], { type: "image/png" });
    expect(await keep({ photo: blob })).toEqual({
      photo: { __t: "blob", type: "image/png", data: "fake:5" },
    });
  });

  it("필드 이름을 보지 않는다 — 새 Blob 필드가 저절로 따라온다", async () => {
    // 엔티티에 Blob 필드가 생겼을 때 백업에서 조용히 빠지는 것이 가장 나쁜 실패다
    const encoded = (await keep({
      아무이름이나: new Blob(["x"], { type: "application/pdf" }),
    })) as Record<string, TaggedBlob>;
    expect(encoded["아무이름이나"].__t).toBe("blob");
  });

  it("중첩된 곳의 Blob도 찾는다", async () => {
    const encoded = (await keep({
      list: [{ deep: { blob: new Blob(["a"]) } }],
    })) as { list: [{ deep: { blob: TaggedBlob } }] };
    expect(encoded.list[0].deep.blob.__t).toBe("blob");
  });

  it("사진을 빼면 그 필드가 사라진다", async () => {
    expect(await drop({ id: "a", blob: new Blob(["x"]) })).toEqual({ id: "a" });
  });

  it("사진을 빼도 나머지 값은 그대로다", async () => {
    const at = new Date("2026-01-02T03:04:05.000Z");
    expect(
      await drop({ id: "a", name: "케이블", at, blob: new Blob(["x"]) })
    ).toEqual({
      id: "a",
      name: "케이블",
      at: { __t: "date", iso: at.toISOString() },
    });
  });

  it("undefined 필드는 담지 않는다", async () => {
    expect(await keep({ id: "a", note: undefined })).toEqual({ id: "a" });
  });

  it("숫자·문자·불리언·null은 그대로 둔다", async () => {
    const value = { n: 3, s: "겉뜨기", b: false, z: null };
    expect(await keep(value)).toEqual(value);
    expect(decodeRecord(value, decodeBlob)).toEqual(value);
  });

  it("배열 순서를 지킨다 — 차트 셀 순서가 곧 무늬다", async () => {
    const ops = ["knit", "yo", "k2tog", "knit"];
    const round = decodeRecord(
      JSON.parse(JSON.stringify(await keep({ ops }))),
      decodeBlob
    ) as { ops: string[] };
    expect(round.ops).toEqual(ops);
  });
});

describe("파일 확인", () => {
  const file: BackupFile = {
    app: "knittinglog",
    format: BACKUP_FORMAT,
    dbVersion: 8,
    createdAt: "2026-08-19T00:00:00.000Z",
    includesMedia: true,
    tables: { projects: [] },
  };

  it("우리 백업 파일을 받아들인다", () => {
    expect(checkBackup(file)).toMatchObject({ ok: true });
  });

  it("다른 파일은 거부한다", () => {
    expect(checkBackup({ hello: 1 }).problem).toBe("notBackup");
    expect(checkBackup(null).problem).toBe("notBackup");
    expect(checkBackup("문자열").problem).toBe("notBackup");
    expect(checkBackup([]).problem).toBe("notBackup");
  });

  it("tables가 없으면 거부한다", () => {
    expect(checkBackup({ ...file, tables: undefined }).problem).toBe(
      "notBackup"
    );
  });

  it("더 새 형식은 거부한다 — 일부만 들어오는 게 성공처럼 보인다", () => {
    expect(checkBackup({ ...file, format: BACKUP_FORMAT + 1 }).problem).toBe(
      "tooNew"
    );
  });

  it("더 오래된 형식은 받아들인다", () => {
    expect(checkBackup({ ...file, format: 0 }).ok).toBe(true);
  });
});

describe("병합 계획", () => {
  const file = (tables: Record<string, unknown[]>): BackupFile => ({
    app: "knittinglog",
    format: BACKUP_FORMAT,
    dbVersion: 8,
    createdAt: "2026-08-19T00:00:00.000Z",
    includesMedia: false,
    tables,
  });
  const known = (table: string, ids: string[] = []) => ({
    table,
    existingIds: new Set(ids),
  });

  it("합치기는 이미 있는 id를 건너뛴다", () => {
    const plan = planImport(
      file({ projects: [{ id: "a" }, { id: "b" }] }),
      "merge",
      [known("projects", ["a"])]
    );
    expect(plan.added).toBe(1);
    expect(plan.skipped).toBe(1);
    expect(plan.tables[0].add).toEqual([{ id: "b" }]);
  });

  it("합치기는 기기에 있는 것을 덮지 않는다 — 오래된 백업으로 뜬 단수를 잃으면 안 된다", () => {
    const plan = planImport(
      file({ counters: [{ id: "c", value: 10 }] }),
      "merge",
      [known("counters", ["c"])]
    );
    expect(plan.added).toBe(0);
    expect(plan.skipped).toBe(1);
  });

  it("덮어쓰기는 전부 넣는다", () => {
    const plan = planImport(
      file({ projects: [{ id: "a" }, { id: "b" }] }),
      "replace",
      [known("projects", ["a"])]
    );
    expect(plan.added).toBe(2);
    expect(plan.skipped).toBe(0);
  });

  it("앱이 모르는 테이블은 넣지 않고 이름만 알려준다", () => {
    const plan = planImport(
      file({ projects: [{ id: "a" }], 미래테이블: [{ id: "x" }] }),
      "merge",
      [known("projects")]
    );
    expect(plan.unknownTables).toEqual(["미래테이블"]);
    expect(plan.tables.map((t) => t.table)).toEqual(["projects"]);
  });

  it("모르는 테이블이 비어 있으면 알리지 않는다 — 알릴 것이 없다", () => {
    const plan = planImport(file({ 빈테이블: [] }), "merge", [
      known("projects"),
    ]);
    expect(plan.unknownTables).toEqual([]);
  });

  it("id가 없는 레코드는 버린다 — 넣으면 나머지까지 잃는다", () => {
    /*
      전에는 이 자리에 "id가 없어도 넣는다 — 판단할 근거가 없으면 잃지 않는
      쪽으로"라고 적혀 있었다. 뜻은 옳지만 전제가 틀렸다. `id`는 Dexie의 기본
      키이고, 키를 만들 수 없는 레코드를 `put`하면 **동기적으로 DataError를
      던진다**(실제 IndexedDB에서 확인했다). 즉 "넣는다"가 불가능하다.

      게다가 가져오기는 한 트랜잭션이라, 그 예외가 트랜잭션을 되돌린다. 망가진
      한 줄을 살리려다 **나머지 천 줄을 잃는다.** 잃지 않는 쪽은 버리는 쪽이다.

      id를 새로 만들어 넣는 방법도 있지만 하지 않는다. id가 없는 레코드는 우리
      파일이 아닐 가능성이 크고, 만들어 넣으면 다음에 같은 파일을 다시
      가져올 때 같은 것이 또 하나 생긴다(중복을 걸러낼 키가 없다).
    */
    const plan = planImport(file({ projects: [{ name: "x" }] }), "merge", [
      known("projects", ["a"]),
    ]);
    expect(plan.added).toBe(0);
    expect(plan.invalid).toBe(1);
  });

  it("빈 백업도 계획이 나온다", () => {
    const plan = planImport(file({}), "merge", [known("projects")]);
    expect(plan.added).toBe(0);
    expect(plan.tables).toEqual([]);
  });
});

describe("저장 공간", () => {
  it("사람이 읽는 용량으로 바꾼다", () => {
    expect(formatBytes(0)).toBe("0B");
    expect(formatBytes(900)).toBe("900B");
    expect(formatBytes(1536)).toBe("1.5KB");
    expect(formatBytes(1024 * 1024 * 3.25)).toBe("3.3MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2GB");
  });

  it("10 이상은 소수를 버린다 — 자리만 차지한다", () => {
    expect(formatBytes(1024 * 1024 * 42.7)).toBe("43MB");
  });

  it("알 수 없는 값은 표시하지 않는다", () => {
    expect(formatBytes(Number.NaN)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });

  it("비율로 여유를 판단한다", () => {
    expect(storageLevel({ usage: 10, quota: 100 }).level).toBe("fine");
    expect(storageLevel({ usage: 80, quota: 100 }).level).toBe("tight");
    expect(storageLevel({ usage: 95, quota: 100 }).level).toBe("full");
  });

  it("브라우저가 알려주지 않으면 모른다고 한다 — 추측하지 않는다", () => {
    expect(storageLevel({}).level).toBe("unknown");
    expect(storageLevel({ usage: 10 }).level).toBe("unknown");
    expect(storageLevel({ usage: 10, quota: 0 }).level).toBe("unknown");
  });
});

describe("파일 이름", () => {
  const day = new Date(2026, 7, 19);

  it("날짜가 들어간다 — 여러 개를 구별할 수 있어야 한다", () => {
    expect(backupFileName(day, true)).toBe("knittinglog-20260819.json");
  });

  it("기록만 담은 파일은 이름에서 구별된다", () => {
    expect(backupFileName(day, false)).toBe("knittinglog-20260819-기록만.json");
  });
});

describe("가져올 값 검사", () => {
  const known = [
    { table: "projects", existingIds: new Set<string>() },
    { table: "counterMarks", existingIds: new Set<string>() },
  ];
  const file = (tables: Record<string, unknown[]>) =>
    ({ app: BACKUP_APP, format: BACKUP_FORMAT, tables }) as never;

  it("키를 만들 수 없는 레코드를 버리고 센다", () => {
    /* 하나라도 들어가면 bulkPut이 던지고, 가져오기는 한 트랜잭션이라
       나머지 천 줄도 못 들어온다. */
    const plan = planImport(
      file({
        projects: [
          { id: "ok", name: "스웨터" },
          { id: "", name: "빈 id" },
          { name: "id 없음" },
          null,
          "문자열",
          [],
        ],
      }),
      "merge",
      known
    );

    expect(plan.added).toBe(1);
    expect(plan.invalid).toBe(5);
  });

  it("덮어쓰기에서도 검사한다", () => {
    // 전에는 덮어쓰기가 행을 그대로 밀어넣었다
    const plan = planImport(
      file({ projects: [{ id: "ok" }, { name: "id 없음" }] }),
      "replace",
      known
    );

    expect(plan.added).toBe(1);
    expect(plan.invalid).toBe(1);
  });

  it("모르는 열거값은 세지만 값을 바꾸지 않는다", () => {
    /* 바꾸면 새 버전 백업을 구 버전에서 열었다가 다시 내보낼 때 원래 값이
       영구히 사라진다. 내보내고 가져오고 다시 내보내도 잃는 게 없어야 한다. */
    const plan = planImport(
      file({
        projects: [{ id: "p", status: "hibernating", category: "poncho" }],
      }),
      "merge",
      known
    );

    expect(plan.unknownValues).toBe(1);
    expect(plan.added).toBe(1);
    expect(plan.tables[0]?.add[0]).toEqual({
      id: "p",
      status: "hibernating",
      category: "poncho",
    });
  });

  it("아는 값만 있으면 아무것도 세지 않는다", () => {
    const plan = planImport(
      file({
        projects: [
          { id: "p", status: "active", category: "sweater", craft: "knit" },
        ],
        counterMarks: [{ id: "m", kind: "lifeline" }],
      }),
      "merge",
      known
    );

    expect(plan.invalid).toBe(0);
    expect(plan.unknownValues).toBe(0);
    expect(plan.added).toBe(2);
  });

  it("없는 칸은 문제로 세지 않는다", () => {
    // 선택 항목이거나 옛 형식일 수 있다
    const plan = planImport(file({ projects: [{ id: "p" }] }), "merge", known);
    expect(plan.unknownValues).toBe(0);
    expect(plan.invalid).toBe(0);
  });
});
