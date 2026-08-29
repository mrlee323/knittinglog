import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Columns, Page } from "@/components/ui/page";
import { StatusBadge } from "@/features/project/components/status-badge";
import { pausedLabel } from "@/features/project/format";
import { YarnDot, YarnStripe } from "@/features/yarn/components/yarn-swatch";
import { projectColors } from "@/features/yarn/repository";
import { coverPhotos } from "@/features/photo/repository";
import { CoverThumb } from "@/features/photo/components/cover-thumb";
import { daysSincePaused } from "@/domain/projectStatus";
import { counterView } from "@/domain/counter";
import {
  aggregateSessions,
  countByStatus,
  currentStreak,
  daysAgo,
  longestPaused,
  resumeCandidate,
  sessionsSince,
  splitDuration,
} from "@/domain/stats";
import { db } from "@/lib/db";
import { useStrings } from "@/i18n";
import { cn } from "@/lib/utils";
import type { Counter, Project } from "@/types/entities";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const t = useStrings();

  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const sessions = useLiveQuery(() => db.counterSessions.toArray(), []);
  const counters = useLiveQuery(() => db.counters.toArray(), []);
  const colors = useLiveQuery(() => projectColors(), []);
  const covers = useLiveQuery(() => coverPhotos(), []);

  if (!projects || !sessions || !counters) return null;

  // 현재 시각은 렌더마다 한 번만 읽는다. 계산 중에 날짜가 넘어가면
  // "이번 주"와 "연속 일수"가 서로 다른 기준을 보게 된다.
  const now = new Date();

  const counts = countByStatus(projects);
  const resume = resumeCandidate(projects);
  const waiting = longestPaused(projects);
  const week = aggregateSessions(sessionsSince(sessions, daysAgo(now, 6)));
  const total = aggregateSessions(sessions);
  const streak = currentStreak(sessions, now);

  if (projects.length === 0) {
    return (
      <Page title={t.nav.dashboard}>
        <div className="border-line rounded-md border border-dashed px-6 py-12 text-center">
          <p className="font-medium">{t.dashboard.emptyTitle}</p>
          <p className="text-text-2 text-small mx-auto mt-1 max-w-xs text-balance">
            {t.dashboard.emptyHint}
          </p>
          <Link to="/projects/new">
            <Button className="mt-4">
              <Plus size={16} />
              {t.project.new}
            </Button>
          </Link>
        </div>
      </Page>
    );
  }

  return (
    <Page wide title={t.nav.dashboard}>
      {/* 왼쪽은 손대는 것(지금 뜨는 것·기다리는 것), 오른쪽은 집계다.
          매일 여는 화면이므로 큰 화면에서 스크롤 없이 둘 다 보이게 한다. */}
      <Columns
        main={
          <>
            <ResumeCard
              project={resume}
              counters={counters}
              color={resume ? colors?.get(resume.id) : undefined}
              cover={resume ? covers?.get(resume.id) : undefined}
            />

            {waiting.length > 0 && (
              <section className="mb-6">
                <h2 className="text-micro text-text-3 mb-1">
                  {t.dashboard.waiting}
                </h2>
                <p className="text-text-3 text-caption mb-2">
                  {t.dashboard.waitingHint}
                </p>
                <ul className="space-y-2">
                  {waiting.map((project) => (
                    <li key={project.id}>
                      <WaitingRow
                        project={project}
                        color={colors?.get(project.id)}
                        cover={covers?.get(project.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        }
        side={
          <>
            {/* 상태 요약 — 누르면 그 상태로 필터된 목록으로 간다 */}
            <section className="mb-6">
              <h2 className="text-micro text-text-3 mb-2">
                {t.dashboard.summary}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <StatTile
                  to="active"
                  label={t.status.active}
                  value={counts.active}
                />
                <StatTile
                  to="hibernating"
                  label={t.status.hibernating}
                  value={counts.hibernating}
                />
                {/* 타일은 누르면 그 상태로 필터된 목록으로 간다. 그래서 숫자도
                    목록과 같은 기준이어야 한다 — "올해 완성"을 보여주면서 전체
                    완성 목록으로 보내면 숫자와 목적지가 어긋난다.
                    연도별 집계는 연간 결산(기획 §3.9 P2)의 몫으로 남긴다. */}
                <StatTile
                  to="finished"
                  label={t.status.finished}
                  value={counts.finished}
                />
              </div>
            </section>

            <section className="mb-6 grid grid-cols-2 gap-2">
              <ActivityCard
                label={t.dashboard.thisWeek}
                rows={week.rows}
                durationMs={week.durationMs}
                note={
                  streak > 0
                    ? t.dashboard.streak.replace("{n}", String(streak))
                    : undefined
                }
              />
              <ActivityCard
                label={t.dashboard.allTime}
                rows={total.rows}
                durationMs={total.durationMs}
                note={
                  total.days > 0
                    ? t.dashboard.days.replace("{n}", String(total.days))
                    : undefined
                }
              />
            </section>
          </>
        }
      />
    </Page>
  );
}

/* --- 이어서 뜨기 ---------------------------------------------------------- */

/**
 * 대시보드에서 뜨기 모드까지 한 번에 간다.
 *
 * 기획의 동선 원칙은 "2탭 안에 뜨기 모드"였는데, 가장 최근에 손댄 프로젝트
 * 하나는 1탭으로 줄일 수 있다. 매일 여는 화면에서 그 한 번이 크다.
 */
function ResumeCard({
  project,
  counters,
  color,
  cover,
}: {
  project: Project | null;
  counters: Counter[];
  color?: string;
  cover?: Blob;
}) {
  const t = useStrings();

  if (!project) {
    return (
      <section className="border-line mb-6 rounded-md border border-dashed p-4">
        <p className="text-text-2 text-small">{t.dashboard.resumeEmpty}</p>
        <p className="text-text-3 text-caption mt-0.5">
          {t.dashboard.resumeEmptyHint}
        </p>
      </section>
    );
  }

  const projectCounters = counters
    .filter((c) => c.projectId === project.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const main = projectCounters[0];
  const view = main ? counterView(main) : null;

  const days = daysSince(project.updatedAt);
  const when =
    project.status === "planning"
      ? t.dashboard.notStarted
      : days === 0
        ? t.dashboard.lastWorkedToday
        : t.dashboard.lastWorkedDays.replace("{n}", String(days));

  return (
    <section className="mb-6">
      <h2 className="text-micro text-text-3 mb-2">{t.dashboard.resume}</h2>
      {/* **상세 규칙이다**(001 결정 1). 목록 카드를 옮겨오지 않는다 — 여기는
          고르는 일이 이미 끝난 자리라 사진이 다시 설득할 필요가 없다. 가장 큰
          것은 단수, 가장 강한 것은 `뜨기`다.

          카드 전체를 Link로 감싸지 않는다. 안에 `뜨기` 링크가 따로 있어서
          중첩되면 안 되고, 무엇보다 **눌러야 할 것이 하나로 선명해야** 한다. */}
      <div className="border-line bg-surface rounded-md border p-4">
        <Link
          to="/projects/$projectId"
          params={{ projectId: project.id }}
          className="flex items-center gap-3"
        >
          {/* 사진은 **조연**이다. 4:3은 003이 잰 상한이지 목표가 아니고,
              사진과 정보 줄이 같은 예산을 쓴다 — 13 mini에서 흡수 한도가
              36px인데 본문 한 줄이 23~26px다(006). 줄이는 만큼 아래 정보가
              산다. */}
          <CoverThumb blob={cover} />
          <div className="min-w-0 flex-1">
            <p className="text-subhead truncate font-semibold">
              {project.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {/* 3px 세로선이 아니라 색점이다 — 001 결정 4, 005에서 옮겼다. */}
              <YarnDot color={color} />
              <p className="text-text-3 text-caption truncate">{when}</p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </Link>

        {/* 화면에서 가장 큰 숫자. 복귀할 때 묻는 것은 "몇 단까지 떴나"다. */}
        <div className="mt-3">
          <p className="text-display font-semibold tabular-nums">
            {view ? view.value : 0}
            {view?.target ? (
              <span className="text-text-3 text-body font-normal">
                {` / ${view.target}`}
              </span>
            ) : null}
          </p>
          <p className="text-text-2 text-caption">
            {main ? main.label : t.counter.defaultLabel}
          </p>
          {view?.progress !== undefined && (
            <div className="bg-sunken mt-2 h-1 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full rounded-full"
                style={{ width: `${view.progress * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* **언제나 있다.** 전에는 카운터가 있을 때만 그렸는데, 그러면 "눌러야
            할 것이 하나로 선명하다"는 그 하나가 없는 화면이 생긴다. 카운터가
            없을 때 무엇을 할지는 뜨기 모드가 이미 안다 —
            `projects.$projectId.knit.tsx`의 `EmptyKnit`가 이름을 묻지 않고
            첫 카운터를 만들어준다. 누르는 것만으로 데이터가 생기지도 않는다.
            생성은 그 화면 안의 두 번째 탭이다. */}
        <Link
          to="/projects/$projectId/knit"
          params={{ projectId: project.id }}
          className="mt-3 block"
        >
          <Button block>{t.counter.knit}</Button>
        </Link>
      </div>
    </section>
  );
}

/** 오늘로부터 며칠 지났나. 음수는 0으로 본다(시계가 어긋난 기기). */
function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/* --- 조각들 --------------------------------------------------------------- */

function StatTile({
  to,
  label,
  value,
}: {
  to: "active" | "hibernating" | "finished";
  label: string;
  value: number;
}) {
  return (
    <Link
      to="/projects"
      search={{ status: to }}
      className={cn(
        "border-line bg-surface hover:border-line-strong rounded-md border p-3 text-center transition",
        value === 0 && "opacity-60"
      )}
    >
      {/* 첫 카드의 단수보다 작아야 한다. 통계는 복귀 다음이다(006). */}
      <p className="text-heading font-semibold">{value}</p>
      <p className="text-text-2 text-caption mt-0.5 truncate">{label}</p>
    </Link>
  );
}

function WaitingRow({
  project,
  color,
  cover,
}: {
  project: Project;
  color?: string;
  cover?: Blob;
}) {
  const t = useStrings();
  const days = daysSincePaused(project);

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="border-line bg-surface hover:border-line-strong flex items-center gap-3 rounded-md border p-3 transition"
    >
      <YarnStripe color={color} />
      <CoverThumb blob={cover} size="sm" />
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

function ActivityCard({
  label,
  rows,
  durationMs,
  note,
}: {
  label: string;
  rows: number;
  durationMs: number;
  note?: string;
}) {
  const t = useStrings();
  const { hours, minutes } = splitDuration(durationMs);

  return (
    <Card>
      <p className="text-micro text-text-3">{label}</p>
      {rows === 0 && durationMs === 0 ? (
        <p className="text-text-3 text-small mt-1">{t.dashboard.noActivity}</p>
      ) : (
        <>
          <p className="text-title mt-0.5 font-semibold">
            {t.dashboard.rows.replace("{n}", String(rows))}
          </p>
          <p className="text-text-2 text-small">
            {hours > 0
              ? t.dashboard.hours
                  .replace("{h}", String(hours))
                  .replace("{m}", String(minutes))
              : t.dashboard.minutes.replace("{m}", String(minutes))}
          </p>
          {note && <p className="text-text-3 text-caption mt-1">{note}</p>}
        </>
      )}
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="border-line bg-surface rounded-md border p-3">
      {children}
    </div>
  );
}
