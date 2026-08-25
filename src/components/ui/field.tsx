import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 입력은 `line-strong` 테두리를 쓴다(docs/DESIGN.md §5). 카드의 `line`보다
 * 한 단계 진한 선이라야 "누를 수 있는 것"과 "읽는 것"이 구분된다.
 *
 * 포커스는 테두리 색만 바꾸지 않고 링을 함께 붙인다. outline을 끈 컨트롤은
 * 전역 :focus-visible 규칙이 닿지 않아서, 여기서 직접 주지 않으면
 * 키보드 사용자에게 포커스가 보이지 않는다.
 */
const CONTROL =
  "w-full min-h-11 rounded-md border border-line-strong bg-surface px-3 py-2 text-small outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/30";

function Wrapper({
  label,
  hint,
  error,
  info,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** 글로는 잘 안 와닿는 값에 붙이는 그림. 라벨 옆 (i)로 펼친다. */
  info?: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-text-2 text-caption">
          {label}
        </label>
        {info && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={label}
            onClick={() => setOpen((v) => !v)}
            className="text-text-3 hover:text-text -my-2 flex size-8 items-center justify-center rounded-md transition"
          >
            <Info size={14} />
          </button>
        )}
      </div>

      {/*
        떠 있는 툴팁이 아니라 그 자리에서 펼친다. 이 필드들이 쓰이는 곳이
        `overflow-y: auto`인 시트라서, 떠 있는 상자는 잘리거나 화면 밖으로
        나간다. 펼치면 아래 내용이 밀릴 뿐 잘리지 않는다.

        기본은 접힘이다. 그림이 늘 펼쳐져 있으면 아는 사람에게는 폼이
        두 배로 길어진다 — 아는 사람은 건너뛸 수 있어야 한다.
      */}
      {info && open && (
        <div
          id={panelId}
          className="border-line bg-sunken mb-2 rounded-md border p-3"
        >
          {info}
        </div>
      )}

      {children}
      {/* 힌트와 에러는 같은 자리를 쓴다. 에러가 있으면 힌트는 물러난다. */}
      {error ? (
        <p role="alert" className="text-frogged text-caption mt-1.5">
          {error}
        </p>
      ) : (
        hint && <p className="text-text-3 text-caption mt-1.5">{hint}</p>
      )}
    </div>
  );
}

/**
 * 컨트롤 좌우에 붙는 것(색 견본, 지우기 버튼 등)을 한 줄로 묶는다.
 *
 * 이걸 두는 이유는 정렬이다. 바깥에서 flex로 감싸면 라벨이 붙은 필드와
 * 안 붙은 요소의 높이가 달라 줄이 어긋나는데, 여기서 묶으면 라벨·힌트는
 * 줄 바깥에 남고 컨트롤끼리만 정렬된다.
 */
function ControlRow({
  before,
  after,
  children,
}: {
  before?: ReactNode;
  after?: ReactNode;
  children: ReactNode;
}) {
  if (!before && !after) return children;
  return (
    <div className="flex items-center gap-2">
      {before}
      <div className="min-w-0 flex-1">{children}</div>
      {after}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  info,
  before,
  after,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  info?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
}) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} info={info} htmlFor={id}>
      <ControlRow before={before} after={after}>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, error && "border-frogged", className)}
          {...props}
        />
      </ControlRow>
    </Wrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        rows={4}
        className={cn(CONTROL, className)}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  info,
  options,
  before,
  after,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  info?: ReactNode;
  options: { value: string; label: string }[];
  before?: ReactNode;
  after?: ReactNode;
}) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} info={info} htmlFor={id}>
      <ControlRow before={before} after={after}>
        <select id={id} className={cn(CONTROL, className)} {...props}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </ControlRow>
    </Wrapper>
  );
}
