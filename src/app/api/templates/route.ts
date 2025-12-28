import type { TemplateLanguage, TemplateVariableType } from "@/types/db";

import { requirePermission } from "@/lib/auth/permissions";
import {
  createTemplate,
  listTemplates,
  type TemplateVariableDefinition,
} from "@/lib/db/queries/templates";
import { mergeTemplateVariablesWithCore } from "@/lib/templates/coreVariables";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseLanguage(input: unknown): TemplateLanguage {
  const v = typeof input === "string" ? input.trim() : "";
  if (v === "tr" || v === "en" || v === "ar" || v === "multi") return v;
  return "multi";
}

function parseVariables(input: unknown): TemplateVariableDefinition[] {
  if (!Array.isArray(input)) return [];
  const out: TemplateVariableDefinition[] = [];

  for (const item of input) {
    if (!isRecord(item)) continue;
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const type = item.type as TemplateVariableType;
    const required = Boolean(item.required);
    const presetRaw = (item as Record<string, unknown>).preset_value;
    const preset_value: string | number | null | undefined =
      typeof presetRaw === "string"
        ? presetRaw
        : typeof presetRaw === "number" && Number.isFinite(presetRaw)
        ? presetRaw
        : presetRaw === null
        ? null
        : undefined;

    const labelI18nRaw = (item as Record<string, unknown>).label_i18n;
    const label_i18n: { tr?: string; en?: string; ar?: string } | undefined =
      labelI18nRaw && typeof labelI18nRaw === "object"
        ? (() => {
            const li = labelI18nRaw as Record<string, unknown>;
            const tr = typeof li.tr === "string" ? li.tr.trim() : "";
            const en = typeof li.en === "string" ? li.en.trim() : "";
            const ar = typeof li.ar === "string" ? li.ar.trim() : "";
            const outLi: { tr?: string; en?: string; ar?: string } = {};
            if (tr) outLi.tr = tr;
            if (en) outLi.en = en;
            if (ar) outLi.ar = ar;
            return Object.keys(outLi).length ? outLi : undefined;
          })()
        : undefined;

    if (!key || !/^[a-zA-Z0-9_]+$/.test(key)) continue;
    if (!label) continue;
    if (type !== "text" && type !== "date" && type !== "number") continue;

    out.push({ key, label, label_i18n, type, required, preset_value });
  }

  return out;
}

export async function GET(request: Request) {
  try {
    await requirePermission("documents:create");
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("active") === "1";

    const rows = await listTemplates({ activeOnly });
    return Response.json({ ok: true, rows });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to list templates" },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requirePermission("templates:manage");

    const body = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return Response.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return Response.json(
        { ok: false, error: "name is required" },
        { status: 400 }
      );
    }

    const description =
      typeof body.description === "string" ? body.description.trim() : null;

    const language = parseLanguage(body.language);
    const isActive =
      typeof body.is_active === "boolean" ? body.is_active : true;

    const htmlContent =
      typeof body.html_content === "string" ? body.html_content : "";
    if (!htmlContent.trim()) {
      return Response.json(
        { ok: false, error: "html_content is required" },
        { status: 400 }
      );
    }

    const variablesDefinition = parseVariables(body.variables_definition);
    const mergedVariablesDefinition = mergeTemplateVariablesWithCore(
      variablesDefinition
    ) as TemplateVariableDefinition[];

    const created = await createTemplate({
      name,
      description,
      language,
      isActive,
      htmlContent,
      variablesDefinition: mergedVariablesDefinition,
      createdByUserId: userId,
    });

    return Response.json({
      ok: true,
      id: created.id,
      version: created.version,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to create template" },
      { status }
    );
  }
}
