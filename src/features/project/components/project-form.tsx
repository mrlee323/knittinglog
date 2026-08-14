import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { useStrings } from "@/i18n";
import {
  projectFormSchema,
  type ProjectFormValues,
} from "@/features/project/repository";

const CATEGORIES = [
  "sweater",
  "hat",
  "socks",
  "shawl",
  "bag",
  "blanket",
  "accessory",
  "other",
] as const;

const EMPTY: ProjectFormValues = {
  name: "",
  craft: "knit",
  category: "sweater",
  notes: "",
};

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useStrings();
  const [values, setValues] = useState<ProjectFormValues>(initial ?? EMPTY);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProjectFormValues, string>>
  >({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K]
  ) => setValues((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = projectFormSchema.safeParse(values);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message])
        )
      );
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(result.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <TextField
        label={t.project.name}
        placeholder={t.project.namePlaceholder}
        value={values.name}
        error={errors.name}
        autoFocus
        onChange={(e) => set("name", e.target.value)}
      />

      <SelectField
        label={t.project.craft}
        value={values.craft}
        onChange={(e) =>
          set("craft", e.target.value as ProjectFormValues["craft"])
        }
        options={[
          { value: "knit", label: t.craft.knit },
          { value: "crochet", label: t.craft.crochet },
        ]}
      />

      <SelectField
        label={t.project.category}
        value={values.category}
        onChange={(e) =>
          set("category", e.target.value as ProjectFormValues["category"])
        }
        options={CATEGORIES.map((c) => ({ value: c, label: t.category[c] }))}
      />

      <TextAreaField
        label={t.project.notes}
        placeholder={t.project.notesPlaceholder}
        value={values.notes ?? ""}
        onChange={(e) => set("notes", e.target.value)}
      />

      <div className="mt-6 flex gap-2">
        <Button type="submit" block disabled={saving}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t.action.cancel}
        </Button>
      </div>
    </form>
  );
}
