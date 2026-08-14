import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
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
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="text-text-2 text-caption mb-1.5 block"
      >
        {label}
      </label>
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

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error && "border-frogged", className)}
        {...props}
      />
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
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <Wrapper label={label} hint={hint} error={error} htmlFor={id}>
      <select id={id} className={cn(CONTROL, className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}
