import { describe, expect, it } from "vitest";
import {
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
    expect(await drop({ id: "a", name: "케이블", at, blob: new Blob(["x"]) })).toEqual({
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
    expect(checkBackup({ ...file, tables: undefined }).problem).toBe("notBackup");
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
    const plan = planImport(file({ counters: [{ id: "c", value: 10 }] }), "merge", [
      known("counters", ["c"]),
    ]);
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
    const plan = planImport(file({ 빈테이블: [] }), "merge", [known("projects")]);
    expect(plan.unknownTables).toEqual([]);
  });

  it("id가 없는 레코드는 넣는다 — 판단할 근거가 없으면 잃지 않는 쪽으로", () => {
    const plan = planImport(file({ projects: [{ name: "x" }] }), "merge", [
      known("projects", ["a"]),
    ]);
    expect(plan.added).toBe(1);
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
