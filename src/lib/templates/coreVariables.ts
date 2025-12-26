import type { TemplateVariableType } from "@/types/db";

export type TemplateVariableDefinitionLike = {
  key: string;
  label: string;
  label_i18n?: {
    tr?: string;
    en?: string;
    ar?: string;
  };
  type: TemplateVariableType;
  required: boolean;
  preset_value?: string | number | null;
};

function labelFromKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getCoreTemplateVariables(): TemplateVariableDefinitionLike[] {
  const core: Array<Omit<TemplateVariableDefinitionLike, "label">> = [
    { key: "owner_full_name", type: "text", required: true },
    { key: "owner_identity_no", type: "text", required: true },
    { key: "owner_birth_date", type: "date", required: true },

    { key: "university_name", type: "text", required: true },
    { key: "dorm_name", type: "text", required: false },
    { key: "dorm_address", type: "text", required: false },

    { key: "issue_date", type: "date", required: true },
    // Our variable schema doesn't have a datetime type; treat it as text.
    { key: "footer_datetime", type: "text", required: true },

    { key: "requester_type", type: "text", required: true },
    { key: "company_id", type: "text", required: false },
    { key: "direct_customer_name", type: "text", required: false },
    { key: "direct_customer_phone", type: "text", required: false },

    { key: "price_amount", type: "number", required: true },
    { key: "price_currency", type: "text", required: true },
  ];

  return core.map((c) => ({ ...c, label: labelFromKey(c.key) }));
}

export function mergeTemplateVariablesWithCore(
  input: TemplateVariableDefinitionLike[]
): TemplateVariableDefinitionLike[] {
  const core = getCoreTemplateVariables();
  const inputByKey = new Map<string, TemplateVariableDefinitionLike>();

  for (const v of input) {
    if (!v || typeof v !== "object") continue;
    if (typeof v.key !== "string") continue;
    const key = v.key.trim();
    if (!key) continue;
    if (!inputByKey.has(key)) inputByKey.set(key, { ...v, key });
  }

  const out: TemplateVariableDefinitionLike[] = [];
  const usedKeys = new Set<string>();

  for (const c of core) {
    const existing = inputByKey.get(c.key);
    if (existing) {
      out.push({
        key: c.key,
        label: existing.label?.trim() ? existing.label.trim() : c.label,
        label_i18n:
          existing.label_i18n && typeof existing.label_i18n === "object"
            ? existing.label_i18n
            : undefined,
        type: existing.type ?? c.type,
        required: Boolean(c.required || existing.required),
        preset_value:
          typeof existing.preset_value === "undefined"
            ? undefined
            : existing.preset_value,
      });
    } else {
      out.push(c);
    }
    usedKeys.add(c.key);
  }

  // Preserve the original order for non-core variables.
  for (const v of input) {
    const key = typeof v?.key === "string" ? v.key.trim() : "";
    if (!key || usedKeys.has(key)) continue;
    out.push({ ...v, key });
    usedKeys.add(key);
  }

  return out;
}
