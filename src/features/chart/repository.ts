import { db, stamp, touch } from "@/lib/db";
import {
  createChart,
  DEFAULT_PALETTE,
  type ColorChart,
} from "@/domain/colorChart";
import type { ColorChartRecord, Id } from "@/types/entities";

/* --- 조회 ----------------------------------------------------------------- */

export const listCharts = () =>
  db.colorCharts.orderBy("updatedAt").reverse().toArray();

export const getChart = (id: Id) => db.colorCharts.get(id);

export const listChartsForProject = (projectId: Id) =>
  db.colorCharts.where("projectId").equals(projectId).toArray();

/* --- 변환 ----------------------------------------------------------------- */

/** 저장 레코드에서 계산용 차트만 떼어낸다 */
export const toChart = (record: ColorChartRecord): ColorChart => ({
  width: record.width,
  height: record.height,
  palette: record.palette,
  cells: record.cells,
});

/* --- 변경 ----------------------------------------------------------------- */

export async function createChartRecord(input: {
  name: string;
  width: number;
  height: number;
  palette?: string[];
  gaugeId?: Id;
  projectId?: Id;
}): Promise<Id> {
  const chart = createChart(
    input.width,
    input.height,
    input.palette ?? DEFAULT_PALETTE
  );
  const record = stamp({
    name: input.name,
    gaugeId: input.gaugeId,
    projectId: input.projectId,
    ...chart,
  });
  await db.colorCharts.add(record as ColorChartRecord);
  return record.id;
}

/**
 * 차트 내용을 저장한다.
 *
 * 칸을 칠할 때마다 쓰지 않는다 — 드래그 한 번에 수십 번 커밋되면 IndexedDB가
 * 밀린다. 화면에서 잦아들 때까지 모아 부른다.
 */
export async function saveChart(id: Id, chart: ColorChart) {
  await db.colorCharts.update(
    id,
    touch({
      width: chart.width,
      height: chart.height,
      palette: chart.palette,
      cells: chart.cells,
    })
  );
}

export async function renameChart(id: Id, name: string) {
  await db.colorCharts.update(id, touch({ name }));
}

export async function setChartGauge(id: Id, gaugeId?: Id) {
  await db.colorCharts.update(id, touch({ gaugeId }));
}

export const deleteChart = (id: Id) => db.colorCharts.delete(id);
