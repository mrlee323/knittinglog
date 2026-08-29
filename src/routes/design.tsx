import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/ui/page";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 살아 있는 스타일 가이드 — `.claude/skills/design-system/SKILL.md`의 검사 도구.
 *
 * 규약에 "만질 수 있는 것은 일곱 상태를 갖는다"고 적어두는 것만으로는 지켜지지
 * 않는다. 어떤 상태는 화면에서 재현하기 어렵고(로딩·오류), 어려우면 안 만들고,
 * 안 만든 것은 아무도 모른다. **그래서 전부 한 화면에 늘어놓는다.**
 *
 * 이 화면은 제품이 아니다. 탭에 넣지 않고 주소로만 연다(`/design`). 대신
 * 컴포넌트를 만들거나 고칠 때마다 여기에 먼저 놓아보고, 일곱 칸이 다 차기
 * 전에는 화면에 쓰지 않는다.
 */
export const Route = createFileRoute("/design")({ component: DesignSystem });

function DesignSystem() {
  const [busy, setBusy] = useState(false);

  return (
    <Page title="디자인 시스템" wide>
      <p className="text-text-2 text-small mb-8 max-w-prose">
        컴포넌트가 가진 상태를 전부 늘어놓는 자리입니다. 새 컴포넌트는 여기서
        일곱 칸이 다 차기 전에는 화면에 쓰지 않습니다. 제품 화면이 아니라
        검사용이라 탭에 없고 주소로만 열립니다.
      </p>

      <Section
        title="버튼"
        note="호버는 포인터 기기에서만 켜집니다. 폰에서 hover를 그냥 쓰면 탭한 뒤 상태가 눌러붙습니다."
      >
        <States>
          <Cell label="default">
            <Button>이어 뜨기</Button>
          </Cell>
          <Cell label="hover" note="마우스를 올려보세요">
            <Button>이어 뜨기</Button>
          </Cell>
          <Cell label="focus-visible" note="Tab 키로 이동">
            <Button>이어 뜨기</Button>
          </Cell>
          <Cell label="active" note="누르고 있어보세요">
            <Button>이어 뜨기</Button>
          </Cell>
          <Cell label="disabled">
            <Button disabled>이어 뜨기</Button>
          </Cell>
          <Cell label="loading" note="라벨 자리를 지킵니다">
            <Button loading>이어 뜨기</Button>
          </Cell>
        </States>

        <SubTitle>변형</SubTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button>주요</Button>
          <Button variant="secondary">보조</Button>
          <Button variant="ghost">고스트</Button>
          <Button variant="danger">
            <Trash2 size={15} aria-hidden />
            풀어버리기
          </Button>
          <Button icon aria-label="추가">
            <Plus size={18} aria-hidden />
          </Button>
        </div>

        <SubTitle>폭이 변하지 않는다</SubTitle>
        <p className="text-text-3 text-caption mb-3 max-w-prose">
          처리 중에 라벨을 스피너로 바꿔치기하면 버튼 폭이 줄고, 옆 버튼이
          당겨집니다. 누르려던 것이 손가락 아래에서 움직이면 저장하려다 삭제가
          눌립니다. 눌러서 확인해보세요.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => setBusy(false), 1600);
            }}
          >
            <Check size={15} aria-hidden />
            저장하기
          </Button>
          <Button variant="danger">삭제</Button>
        </div>
      </Section>

      <Section
        title="기다리는 화면"
        note="return null을 대신합니다. 완성된 화면과 레이아웃이 같아야 데이터가 도착할 때 튀지 않습니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-line bg-surface rounded-md border p-4">
            <p className="text-text-3 text-caption mb-3">기다리는 중</p>
            <div className="flex gap-3">
              <Skeleton className="size-14 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-2 h-4 w-2/3" />
                <SkeletonText lines={2} />
              </div>
            </div>
          </div>
          <div className="border-line bg-surface rounded-md border p-4">
            <p className="text-text-3 text-caption mb-3">도착한 뒤</p>
            <div className="flex gap-3">
              <div className="bg-sunken size-14 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="text-subhead font-semibold">회색 래글런 스웨터</p>
                <p className="text-text-2 text-small">
                  몸판 62 / 120단 · 라이프라인 48단
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="비었을 때 · 실패했을 때"
        note="'없어요'로 끝내지 않습니다. 빈 화면은 다음 행동으로 가는 문이고, 실패한 화면에는 다시 시도가 있어야 합니다."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-line rounded-md border border-dashed p-6 text-center">
            <p className="text-subhead mb-1 font-semibold">
              아직 카운터가 없어요
            </p>
            <p className="text-text-2 text-small mb-4">
              단수를 세기 시작하면 여기서 이어 뜬 자리를 기억합니다.
            </p>
            <Button>
              <Plus size={15} aria-hidden />
              단수 카운터 만들기
            </Button>
          </div>
          <div className="border-line rounded-md border p-6 text-center">
            <p className="text-subhead mb-1 font-semibold">
              사진을 불러오지 못했어요
            </p>
            <p className="text-text-2 text-small mb-4">
              저장 공간에서 읽는 데 실패했습니다. 기록은 그대로 있습니다.
            </p>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </div>
      </Section>

      <Section
        title="모션"
        note="셋뿐입니다. 여기 없는 시간을 화면에서 새로 만들지 않습니다."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Motion name="tap" ms={90} use="눌림 · 색 바뀜 · 호버" />
          <Motion name="move" ms={220} use="시트가 들어오고 나감" />
          <Motion name="soft" ms={320} use="높이 · 목록 재배치" />
        </div>
        <p className="text-text-3 text-caption mt-4 max-w-prose">
          움직임 줄이기를 켠 기기에서는 전부 멈춥니다. 뜨기 모드의 +1에는 전환을
          걸지 않습니다 — 90ms도 100단을 세면 9초이고, 세는 동작의 응답은 진동이
          맡습니다.
        </p>
      </Section>

      <Section title="글자" note="숫자는 언제나 자릿수가 고정됩니다.">
        <div className="space-y-1">
          {(
            [
              ["display", "text-display"],
              ["title", "text-title"],
              ["heading", "text-heading"],
              ["subhead", "text-subhead"],
              ["body", "text-body"],
              ["small", "text-small"],
              ["caption", "text-caption"],
            ] as const
          ).map(([name, cls]) => (
            <div key={name} className="flex items-baseline gap-4">
              <span className="text-text-3 text-caption w-16 shrink-0">
                {name}
              </span>
              <span className={cn(cls, "truncate font-semibold")}>
                회색 래글런 스웨터 62단
              </span>
            </div>
          ))}
        </div>

        <SubTitle>한글 줄바꿈</SubTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border-line bg-surface rounded-md border p-3">
            <p className="text-text-3 text-caption mb-2">
              keep-all (지금) — 어절에서만 끊습니다
            </p>
            <p className="text-subhead font-semibold" style={{ maxWidth: 116 }}>
              눈송이요크 가디건
            </p>
          </div>
          <div className="border-line bg-surface rounded-md border p-3">
            <p className="text-text-3 text-caption mb-2">
              전 — 어절 안에서 끊깁니다
            </p>
            <p
              className="text-subhead font-semibold"
              style={{ maxWidth: 116, wordBreak: "break-all" }}
            >
              눈송이요크 가디건
            </p>
          </div>
        </div>
      </Section>

      <Section title="높이" note="떠 있는 것에만 그림자를 씁니다.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Elev name="0 · 카드" cls="border-line border" />
          <Elev name="1 · 붙은 바" cls="shadow-raised" />
          <Elev name="2 · 시트" cls="shadow-overlay" />
        </div>
      </Section>
    </Page>
  );
}

/* --- 이 화면에서만 쓰는 조각 ------------------------------------------- */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-line mb-10 border-t pt-6">
      <h2 className="text-heading font-semibold">{title}</h2>
      {note && (
        <p className="text-text-2 text-small mt-1 mb-5 max-w-prose">{note}</p>
      )}
      {children}
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-text-3 text-caption mt-7 mb-3 font-medium">
      {children}
    </h3>
  );
}

function States({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {children}
    </div>
  );
}

function Cell({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line bg-surface flex flex-col gap-2 rounded-md border p-3">
      <span className="text-text-3 text-caption">{label}</span>
      <div className="flex min-h-11 items-center">{children}</div>
      {note && <span className="text-text-3 text-caption">{note}</span>}
    </div>
  );
}

/** 실제로 그 시간만큼 움직여 보여준다. 표로 적어두면 감이 오지 않는다. */
function Motion({ name, ms, use }: { name: string; ms: number; use: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="border-line bg-surface hover:border-line-strong rounded-md border p-3 text-left transition"
    >
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-small font-semibold">{name}</span>
        <span className="text-text-3 text-caption">{ms}ms</span>
      </div>
      <div className="bg-sunken mb-2 h-6 overflow-hidden rounded-sm">
        <div
          className="bg-accent h-full w-6 rounded-sm"
          style={{
            transform: on ? "translateX(calc(100% * 3))" : "none",
            transition: `transform var(--ease-${name})`,
          }}
        />
      </div>
      <span className="text-text-3 text-caption">{use}</span>
    </button>
  );
}

function Elev({ name, cls }: { name: string; cls: string }) {
  return (
    <div className={cn("bg-surface rounded-md p-4", cls)}>
      <span className="text-small">{name}</span>
    </div>
  );
}
