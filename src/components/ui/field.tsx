import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent";

function Wrapper({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="text-text-muted mb-1.5 block text-sm">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-frogged mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} htmlFor={id}>
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
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
}) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} htmlFor={id}>
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
  error,
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <Wrapper label={label} error={error} htmlFor={id}>
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
