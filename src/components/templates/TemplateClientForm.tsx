"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { TemplateLanguage, TemplateVariableType } from "@/types/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  mergeTemplateVariablesWithCore,
  type TemplateVariableDefinitionLike,
} from "@/lib/templates/coreVariables";

export type TemplateVariableFormRow = {
  key: string;
  label: string;
  label_tr: string;
  label_en: string;
  label_ar: string;
  preset_value: string;
  type: TemplateVariableType;
  required: boolean;
};

export type TemplateFormValues = {
  name: string;
  description: string;
  language: TemplateLanguage;
  is_active: boolean;
  html_content: string;
  variables_definition: TemplateVariableFormRow[];
};

function normalizeKey(k: string): string {
  return k.trim();
}

function normalizePresetValue(v: string): string | null {
  const s = v.trim();
  return s ? s : null;
}

export default function TemplateClientForm(props: {
  mode: "create" | "edit";
  templateId?: string;
  initialValues?: Partial<TemplateFormValues>;
}) {
  const t = useTranslations("templates.form");

  const initialVariables = useMemo<TemplateVariableFormRow[]>(() => {
    const raw = props.initialValues?.variables_definition;
    const parsed: TemplateVariableDefinitionLike[] = Array.isArray(raw)
      ? raw.map((r) => ({
          key: String(r.key ?? ""),
          label: String(r.label ?? ""),
          label_i18n: (() => {
            const rRec = r as unknown as Record<string, unknown>;
            const liRaw = rRec.label_i18n;
            const li =
              liRaw && typeof liRaw === "object"
                ? (liRaw as Record<string, unknown>)
                : null;

            const tr = typeof li?.tr === "string" ? li.tr.trim() : "";
            const en = typeof li?.en === "string" ? li.en.trim() : "";
            const ar = typeof li?.ar === "string" ? li.ar.trim() : "";

            const outLi: { tr?: string; en?: string; ar?: string } = {};
            if (tr) outLi.tr = tr;
            if (en) outLi.en = en;
            if (ar) outLi.ar = ar;
            return Object.keys(outLi).length ? outLi : undefined;
          })(),
          preset_value: (() => {
            const presetRaw = (r as unknown as Record<string, unknown>)
              .preset_value;
            if (typeof presetRaw === "string") return presetRaw;
            if (typeof presetRaw === "number" && Number.isFinite(presetRaw))
              return presetRaw;
            return null;
          })(),
          type: (r.type ?? "text") as TemplateVariableType,
          required: Boolean(r.required),
        }))
      : [];

    const merged = mergeTemplateVariablesWithCore(parsed);
    return merged.map((v) => ({
      key: v.key,
      label: v.label,
      label_tr: v.label_i18n?.tr ?? "",
      label_en: v.label_i18n?.en ?? "",
      label_ar: v.label_i18n?.ar ?? "",
      preset_value:
        typeof v.preset_value === "number"
          ? String(v.preset_value)
          : typeof v.preset_value === "string"
          ? v.preset_value
          : "",
      type: v.type,
      required: Boolean(v.required),
    }));
  }, [props.initialValues?.variables_definition]);

  const [values, setValues] = useState<TemplateFormValues>({
    name: props.initialValues?.name ?? "",
    description: props.initialValues?.description ?? "",
    language: props.initialValues?.language ?? "multi",
    is_active: props.initialValues?.is_active ?? true,
    html_content: props.initialValues?.html_content ?? "",
    variables_definition: initialVariables,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addVariable() {
    setValues((v) => ({
      ...v,
      variables_definition: [
        ...v.variables_definition,
        {
          key: "",
          label: "",
          label_tr: "",
          label_en: "",
          label_ar: "",
          preset_value: "",
          type: "text",
          required: false,
        },
      ],
    }));
  }

  function updateVariable(
    idx: number,
    patch: Partial<TemplateVariableFormRow>
  ) {
    setValues((v) => ({
      ...v,
      variables_definition: v.variables_definition.map((row, i) =>
        i === idx ? { ...row, ...patch } : row
      ),
    }));
  }

  function removeVariable(idx: number) {
    setValues((v) => ({
      ...v,
      variables_definition: v.variables_definition.filter((_, i) => i !== idx),
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = values.name.trim();
    if (!name) {
      setError(t("errors.nameRequired"));
      return;
    }

    const html = values.html_content.trim();
    if (!html) {
      setError(t("errors.htmlRequired"));
      return;
    }

    const cleanedVars = values.variables_definition
      .map((v) => ({
        key: normalizeKey(v.key),
        label: v.label.trim(),
        label_i18n: (() => {
          const tr = v.label_tr.trim();
          const en = v.label_en.trim();
          const ar = v.label_ar.trim();
          const out: { tr?: string; en?: string; ar?: string } = {};
          if (tr) out.tr = tr;
          if (en) out.en = en;
          if (ar) out.ar = ar;
          return Object.keys(out).length ? out : undefined;
        })(),
        preset_value: normalizePresetValue(v.preset_value),
        type: v.type,
        required: Boolean(v.required),
      }))
      .filter((v) => v.key && v.label && /^[a-zA-Z0-9_]+$/.test(v.key));

    if (!cleanedVars.length) {
      setError(t("errors.variablesRequired"));
      return;
    }

    setLoading(true);
    try {
      const url =
        props.mode === "create"
          ? "/api/templates"
          : `/api/templates/${encodeURIComponent(props.templateId ?? "")}`;
      const method = props.mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description: values.description.trim() || null,
          language: values.language,
          is_active: values.is_active,
          html_content: html,
          variables_definition: cleanedVars,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        id?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setError(data?.error ?? t("errors.saveFailed"));
        return;
      }

      const id = props.mode === "create" ? data.id : props.templateId;
      if (id) {
        window.location.href = `/templates/${id}/edit`;
      } else {
        window.location.href = "/templates";
      }
    } catch {
      setError(t("errors.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <div className="text-xs text-muted-foreground">{t("fields.name")}</div>
        <Input
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder={t("placeholders.name")}
          required
        />
      </div>

      <div>
        <div className="text-xs text-muted-foreground">
          {t("fields.description")}
        </div>
        <Input
          value={values.description}
          onChange={(e) =>
            setValues((v) => ({ ...v, description: e.target.value }))
          }
          placeholder={t("placeholders.description")}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {t("fields.language")}
          </div>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&>option]:bg-background [&>option]:text-foreground"
            value={values.language}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                language: e.target.value as TemplateLanguage,
              }))
            }
          >
            <option value="multi">multi</option>
            <option value="tr">tr</option>
            <option value="en">en</option>
            <option value="ar">ar</option>
          </select>
        </div>

        <label className="flex items-center gap-2 pt-6 text-sm">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) =>
              setValues((v) => ({ ...v, is_active: e.target.checked }))
            }
          />
          {t("fields.active")}
        </label>
      </div>

      <div>
        <div className="text-xs text-muted-foreground">{t("fields.html")}</div>
        <textarea
          className="min-h-55 w-full rounded-md border border-input bg-transparent p-3 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={values.html_content}
          onChange={(e) =>
            setValues((v) => ({ ...v, html_content: e.target.value }))
          }
          placeholder={t("placeholders.html")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{t("fields.variables")}</div>
            <div className="text-xs text-muted-foreground">
              {t("hints.variables")} {t("hints.systemVariables")}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addVariable}
          >
            {t("actions.addVariable")}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">{t("vars.key")}</th>
                <th className="px-3 py-2">{t("vars.label")}</th>
                <th className="px-3 py-2">{t("vars.preset")}</th>
                <th className="px-3 py-2">{t("vars.type")}</th>
                <th className="px-3 py-2">{t("vars.required")}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {values.variables_definition.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="px-3 py-2">
                    <Input
                      value={row.key}
                      onChange={(e) =>
                        updateVariable(idx, { key: e.target.value })
                      }
                      placeholder="owner_full_name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="grid gap-2">
                      <Input
                        value={row.label}
                        onChange={(e) =>
                          updateVariable(idx, { label: e.target.value })
                        }
                        placeholder="Full name"
                      />

                      {values.language === "multi" ? (
                        <div className="grid gap-2 md:grid-cols-3">
                          <Input
                            value={row.label_tr}
                            onChange={(e) =>
                              updateVariable(idx, { label_tr: e.target.value })
                            }
                            placeholder={t("vars.labelTr")}
                          />
                          <Input
                            value={row.label_en}
                            onChange={(e) =>
                              updateVariable(idx, { label_en: e.target.value })
                            }
                            placeholder={t("vars.labelEn")}
                          />
                          <Input
                            value={row.label_ar}
                            onChange={(e) =>
                              updateVariable(idx, { label_ar: e.target.value })
                            }
                            placeholder={t("vars.labelAr")}
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={row.preset_value}
                      onChange={(e) =>
                        updateVariable(idx, { preset_value: e.target.value })
                      }
                      placeholder={t("vars.presetPlaceholder")}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={row.type}
                      onChange={(e) =>
                        updateVariable(idx, {
                          type: e.target.value as TemplateVariableType,
                        })
                      }
                    >
                      <option value="text">text</option>
                      <option value="date">date</option>
                      <option value="number">number</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.required}
                      onChange={(e) =>
                        updateVariable(idx, { required: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeVariable(idx)}
                    >
                      {t("actions.remove")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? t("actions.saving")
          : props.mode === "create"
          ? t("actions.create")
          : t("actions.update")}
      </Button>
    </form>
  );
}
