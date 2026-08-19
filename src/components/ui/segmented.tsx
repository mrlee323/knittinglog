import { cn } from "@/lib/utils";

/**
 * 서로 배타적인 몇 개 중 하나를 고르는 컨트롤.
 *
 * 선택지가 셋 안쪽이고 전부 한눈에 보여야 할 때 쓴다 — 그보다 많으면
 * SelectField가 맞다.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <section className={cn("mb-5", className)}>
      <h2 className="text-text-2 text-small mb-2 font-medium">{label}</h2>
      <div className="bg-sunken flex gap-1 rounded-md p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              "text-small flex-1 rounded-md py-2 transition-colors",
              value === option.value
                ? "bg-accent text-on-accent font-semibold"
                : "text-text-2"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
