import { db, stamp, touch } from "@/lib/db";
import { createStitchChart, type StitchChart } from "@/domain/stitchChart";
import type { Id, StitchChartRecord } from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

export const listStitchCharts = () =>
  db.stitchCharts.orderBy("updatedAt").reverse().toArray();

export const getStitchChart = (id: Id) => db.stitchCharts.get(id);

export const listStitchChartsForProject = (projectId: Id) =>
  db.stitchCharts.where("projectId").equals(projectId).toArray();

/* --- 변환 ----------------------------------------------------------------- */

/** 저장 레코드에서 계산용 차트만 떼어낸다 */
export const toStitchChart = (record: StitchChartRecord): StitchChart => ({
  width: record.width,
  height: record.height,
  ops: record.ops,
});

/* --- 변경 ----------------------------------------------------------------- */

export async function createStitchChartRecord(input: {
  name: string;
  width: number;
  height: number;
  gaugeId?: Id;
  projectId?: Id;
}): Promise<Id> {
  const chart = createStitchChart(input.width, input.height);
  const record = stamp({
    name: input.name,
    gaugeId: input.gaugeId,
    projectId: input.projectId,
    ...chart,
  });
  await db.stitchCharts.add(record as StitchChartRecord);
  return record.id;
}

/**
 * 차트 내용을 저장한다.
 *
 * 칸을 칠할 때마다 쓰지 않는다 — 드래그 한 번에 수십 번 커밋되면 IndexedDB가
 * 밀린다. 화면에서 잦아들 때까지 모아 부른다.
 */
export async function saveStitchChart(id: Id, chart: StitchChart) {
  await db.stitchCharts.update(
    id,
    touch({ width: chart.width, height: chart.height, ops: chart.ops })
  );
}

export async function renameStitchChart(id: Id, name: string) {
  await db.stitchCharts.update(id, touch({ name }));
}

export async function setStitchChartGauge(id: Id, gaugeId?: Id) {
  await db.stitchCharts.update(id, touch({ gaugeId }));
}

/** 시작 코수. 비우면 무늬 자체의 앞뒤만 검산한다. */
export async function setStitchChartCastOn(id: Id, castOn?: number) {
  await db.stitchCharts.update(id, touch({ castOn }));
}

export const deleteStitchChart = (id: Id) => db.stitchCharts.delete(id);
