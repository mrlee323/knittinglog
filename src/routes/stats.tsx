import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Columns, Page } from "@/components/ui/page";
import { StatusBadge } from "@/features/project/components/status-badge";
import { pausedLabel } from "@/features/project/format";
import { YarnStripe } from "@/features/yarn/components/yarn-swatch";
import { projectColors } from "@/features/yarn/repository";
import { daysSincePaused } from "@/domain/projectStatus";
import {
  aggregateSessions,
  countByStatus,
  finishedInYear,
  longestPaused,
  pauseReasonBreakdown,
  rowsHeatmap,
  splitDuration,
  sumYarnUse,
  type HeatCell,
} from "@/domain/stats";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/entities";
import type { ReactNode } from "react";

export const Route = createFileRoute("/stats")({ component: Stats });

/** 최근 13주. 폰 폭에서 한 화면에 들어가는 최대치다. */
const HEATMAP_DAYS = 91;

function Stats() {
  const t = useStrings();

  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const sessions = useLiveQuery(() => db.counterSessions.toArray(), []);
  const allocations = useLiveQuery(() => db.yarnAllocations.toArray(), []);
  const yarns = useLiveQuery(() => db.yarns.toArray(), []);
  const colors = useLiveQuery(() => projectColors(), []);

  if (!projects || !sessions || !allocations || !yarns) return null;

  // 현재 시각은 렌더마다 한 번만 읽는다. 계산 중에 날짜가 넘어가면
  // 히트맵과 집계가 서로 다른 기준을 보게 된다.
  const now = new Date();

  const counts = countByStatus(projects);
  const total = aggregateSessions(sessions);
  const heat = rowsHeatmap(sessions, now, HEATMAP_DAYS);
  const reasons = pauseReasonBreakdown(projects);
  const idle = longestPaused(projects, 5);

  // 쓴 실 = 완성한 작품에 배정한 실. 진행중인 것은 아직 쓴 게 아니다.
  const finishedIds = new Set(
    projects.filter((p) => p.status === "finished").map((p) => p.id)
  );
  const yarnById = new Map(yarns.map((y) => [y.id, y]));
  const used = sumYarnUse(
    allocations
      .filter((a) => finishedIds.has(a.projectId))
      .map((a) => {
        const yarn = yarnById.get(a.yarnId);
        return {
          skeins: a.skeinsAllocated,
          skeinGrams: yarn?.skeinGrams,
          skeinMeters: yarn?.skeinMeters,
        };
      })
  );

  if (projects.length === 0) {
    return (
      <Page title={t.stats.title}>
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="font-medium">{t.stats.empty}</p>
          <p className="text-text-2 text-small mx-auto mt-1 max-w-xs text-balance">
            {t.stats.emptyHint}
          </p>
        </div>
      </Page>
    );
  }

  const { hours, minutes } = splitDuration(total.durationMs);

  return (
    <Page wide title={t.stats.title}>
      {/* 왼쪽은 돌아볼 것(왜 멈췄나·무엇이 멈춰 있나), 오른쪽은 쌓인 숫자다.
          이 화면의 목적은 자랑이 아니라 멈춘 것을 마주하는 것이므로
          방치 리포트를 주 단에 둔다. */}
      <Columns
        main={
          <>
            <Section title={t.stats.reasonTitle} note={t.stats.reasonNote}>
              {reasons.length === 0 ? (
                <Empty>{t.stats.reasonEmpty}</Empty>
              ) : (
                <>
                  <p className="text-subhead mb-3 font-semibold">
                    {t.stats.reasonTop.replace(
                      "{reason}",
                      t.pauseReason[reasons[0].reason]
                    )}
                  </p>
                  <ul className="space-y-2">
                    {reasons.map(({ reason, count }) => (
                      <li key={reason}>
                        <ReasonBar
                          label={t.pauseReason[reason]}
                          count={count}
                          max={reasons[0].count}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            <Section title={t.stats.idle}>
              {idle.length === 0 ? (
                <Empty>{t.stats.idleEmpty}</Empty>
              ) : (
                <ul className="space-y-2">
                  {idle.map((project) => (
                    <li key={project.id}>
                      <IdleRow
                        project={project}
                        color={colors?.get(project.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={t.stats.activity} note={t.stats.activityNote}>
              {total.days === 0 ? (
                <Empty>{t.stats.activityEmpty}</Empty>
              ) : (
                <Heatmap cells={heat} />
              )}
            </Section>
          </>
        }
        side={
          <Section title={t.stats.totals}>
            <div className="grid grid-cols-2 gap-2">
              <Tile
                label={t.stats.totalRows}
                value={t.dashboard.rows.replace("{n}", String(total.rows))}
              />
              <Tile
                label={t.stats.totalTime}
                value={
                  hours > 0
                    ? t.dashboard.hours
                        .replace("{h}", String(hours))
                        .replace("{m}", String(minutes))
                    : t.dashboard.minutes.replace("{m}", String(minutes))
                }
              />
              <Tile
                label={t.stats.totalDays}
                value={t.dashboard.days.replace("{n}", String(total.days))}
              />
              <Tile
                label={t.stats.finishedCount}
                value={String(counts.finished)}
                note={t.stats.finishedThisYear.replace(
                  "{n}",
                  String(finishedInYear(projects, now))
                )}
              />
            </div>

            {used.skeins > 0 && (
              <div className="border-line bg-surface mt-2 rounded-md border p-3">
                <p className="text-micro text-text-3">{t.stats.yarnUsed}</p>
                <p className="text-title font-semibold">
                  {t.stats.yarnUsedValue.replace(
                    "{skeins}",
                    String(used.skeins)
                  )}
                </p>
                {/* 스펙을 모르는 실이 섞여 있으면 합계가 실제보다 작다.
                    0이면 아예 적지 않는다 — 0g라고 쓰면 거짓이 된다. */}
                {used.grams > 0 && used.meters > 0 && (
                  <p className="text-text-2 text-small">
                    {t.stats.yarnUsedDetail
                      .replace("{grams}", String(Math.round(used.grams)))
                      .replace("{meters}", String(Math.round(used.meters)))}
                  </p>
                )}
                <p className="text-text-3 text-caption mt-1">
                  {t.stats.yarnUsedNote}
                </p>
              </div>
            )}
          </Section>
        }
      />
    </Page>
  );
}

/* --- 방치 리포트 ---------------------------------------------------------- */

/**
 * 사유별 막대.
 *
 * 경고색을 쓰지 않는다. 중단은 잘못이 아니고, 이 화면은 추궁이 아니라
 * 자기 인식을 위한 것이다(docs/PLAN.md §1).
 */
function ReasonBar({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-small">{label}</span>
        <span className="text-text-2 text-caption">{count}</span>
      </div>
      <div className="bg-sunken h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-hibernating h-full rounded-full"
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

function IdleRow({ project, color }: { project: Project; color?: string }) {
  const t = useStrings();
  const days = daysSincePaused(project);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-3 transition"
    >
      <YarnStripe color={color} />
      <div className="min-w-0 flex-1">
        <p className="text-small truncate font-medium">{project.name}</p>
        <p className="text-hibernating text-caption">
          {days !== null && pausedLabel(t, days)}
          {project.pauseReason && ` · ${t.pauseReason[project.pauseReason]}`}
        </p>
      </div>
      <StatusBadge status={project.status} />
    </Link>
  );
}

/* --- 잔디 ----------------------------------------------------------------- */

const LEVEL_TONE = [
  // 안 뜬 날도 보여야 한다. sunken은 canvas와 거의 같아서 격자가 달력이 아니라
  // 흩어진 점으로 읽힌다 — 빈 칸이 보일 때만 "꾸준함"이 읽힌다.
  "bg-line",
  "bg-hibernating/25",
  "bg-hibernating/50",
  "bg-hibernating/75",
  "bg-hibernating",
] as const;

/**
 * 날짜별 활동 격자.
 *
 * 첫 주는 시작 요일만큼 비워야 열이 요일과 맞는다. 안 비우면 격자가
 * 요일 단위로 읽히지 않고 그냥 사각형 더미가 된다.
 */
function Heatmap({ cells }: { cells: HeatCell[] }) {
  const t = useStrings();
  const pad = cells.length > 0 ? cells[0].weekday : 0;

  return (
    <div className="border-line bg-surface overflow-x-auto rounded-md border p-3">
      <div
        className="grid w-max grid-flow-col gap-1"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad-${i}`} className="size-3" />
        ))}
        {cells.map((cell) => (
          <span
            key={cell.key}
            title={`${cell.key} · ${t.dashboard.rows.replace("{n}", String(cell.rows))}`}
            className={cn("size-3 rounded-sm", LEVEL_TONE[cell.level])}
          />
        ))}
      </div>
    </div>
  );
}

/* --- 공통 ----------------------------------------------------------------- */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-micro text-text-3 mb-1">{title}</h2>
      {note && <p className="text-text-3 text-caption mb-2">{note}</p>}
      {!note && <div className="mb-2" />}
      {children}
    </section>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-line bg-surface rounded-md border p-3">
      <p className="text-micro text-text-3">{label}</p>
      <p className="text-subhead font-semibold">{value}</p>
      {note && <p className="text-text-3 text-caption">{note}</p>}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="border-line text-text-2 text-small rounded-md border border-dashed p-4">
      {children}
    </p>
  );
}
