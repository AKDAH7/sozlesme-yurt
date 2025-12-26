import { getPool } from "@/lib/db/pool";
import type { TemplateLanguage } from "@/types/db";

export type TemplateVariableDefinition = {
  key: string;
  label: string;
  label_i18n?: {
    tr?: string;
    en?: string;
    ar?: string;
  };
  type: "text" | "date" | "number";
  required: boolean;
  preset_value?: string | number | null;
};

export type TemplateListRow = {
  id: string;
  name: string;
  description: string | null;
  language: TemplateLanguage;
  is_active: boolean;
  latest_version: number | null;
  variables_count: number;
  updated_at: string;
};

export type TemplateVersionRow = {
  template_id: string;
  version: number;
  html_content: string;
  variables_definition: TemplateVariableDefinition[];
  created_at: string;
};

export type TemplateDetailsRow = {
  id: string;
  name: string;
  description: string | null;
  language: TemplateLanguage;
  is_active: boolean;
  latest_version: number;
  html_content: string;
  variables_definition: TemplateVariableDefinition[];
};

function parseVariablesDefinition(raw: unknown): TemplateVariableDefinition[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateVariableDefinition[] = [];
  for (const item of raw) {
    const rec = item as Record<string, unknown> | null;
    if (!rec || typeof rec !== "object") continue;

    const key = typeof rec.key === "string" ? rec.key.trim() : "";
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    const type = rec.type;
    const required = Boolean(rec.required);
    const presetRaw = rec.preset_value;
    const presetValue: string | number | null | undefined =
      typeof presetRaw === "string"
        ? presetRaw
        : typeof presetRaw === "number" && Number.isFinite(presetRaw)
        ? presetRaw
        : presetRaw === null
        ? null
        : undefined;

    if (!key || !/^[a-zA-Z0-9_]+$/.test(key)) continue;
    if (!label) continue;
    if (type !== "text" && type !== "date" && type !== "number") continue;

    const labelI18nRaw = rec.label_i18n;
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

    out.push({
      key,
      label,
      label_i18n,
      type,
      required,
      preset_value: presetValue,
    });
  }
  return out;
}

export async function listTemplates(params?: {
  activeOnly?: boolean;
}): Promise<TemplateListRow[]> {
  const pool = getPool();
  const activeOnly = params?.activeOnly === true;

  const result = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    language: TemplateLanguage;
    is_active: boolean;
    latest_version: string | null;
    variables_count: string | null;
    updated_at: string;
  }>(
    `SELECT
      tf.id,
      tf.name,
      tf.description,
      tf.language,
      tf.is_active,
      tv.version::text as latest_version,
      COALESCE(jsonb_array_length(tv.variables_definition), 0)::text as variables_count,
      tf.updated_at::text as updated_at
     FROM template_families tf
     LEFT JOIN LATERAL (
       SELECT version, variables_definition
       FROM template_versions
       WHERE template_id = tf.id
       ORDER BY version DESC
       LIMIT 1
     ) tv ON true
     WHERE ($1::boolean = false OR tf.is_active = true)
     ORDER BY tf.updated_at DESC, tf.created_at DESC`,
    [activeOnly]
  );

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    language: r.language,
    is_active: r.is_active,
    latest_version: r.latest_version ? Number(r.latest_version) : null,
    variables_count: Number(r.variables_count ?? "0"),
    updated_at: r.updated_at,
  }));
}

export async function getTemplateDetails(params: {
  templateId: string;
  version?: number;
}): Promise<TemplateDetailsRow | null> {
  const pool = getPool();
  const templateId = params.templateId;
  const version =
    typeof params.version === "number" && Number.isFinite(params.version)
      ? Math.max(1, Math.floor(params.version))
      : null;

  const result = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    language: TemplateLanguage;
    is_active: boolean;
    version: string;
    html_content: string;
    variables_definition: unknown;
  }>(
    `SELECT
      tf.id,
      tf.name,
      tf.description,
      tf.language,
      tf.is_active,
      tv.version::text as version,
      tv.html_content,
      tv.variables_definition
     FROM template_families tf
     JOIN LATERAL (
       SELECT version, html_content, variables_definition
       FROM template_versions
       WHERE template_id = tf.id
         AND ($2::int IS NULL OR version = $2::int)
       ORDER BY version DESC
       LIMIT 1
     ) tv ON true
     WHERE tf.id = $1
     LIMIT 1`,
    [templateId, version]
  );

  const row = result.rows[0];
  if (!row) return null;

  const parsed = parseVariablesDefinition(row.variables_definition);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    language: row.language,
    is_active: row.is_active,
    latest_version: Number(row.version),
    html_content: row.html_content,
    variables_definition: parsed,
  };
}

export async function createTemplate(params: {
  name: string;
  description: string | null;
  language: TemplateLanguage;
  isActive: boolean;
  htmlContent: string;
  variablesDefinition: TemplateVariableDefinition[];
  createdByUserId: string;
}): Promise<{ id: string; version: number }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const fam = await client.query<{ id: string }>(
      `INSERT INTO template_families (name, description, language, is_active, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        params.name,
        params.description,
        params.language,
        params.isActive,
        params.createdByUserId,
      ]
    );

    const id = fam.rows[0]?.id;
    if (!id) throw new Error("Failed to create template");

    await client.query(
      `INSERT INTO template_versions (template_id, version, html_content, variables_definition, created_by_user_id)
       VALUES ($1, 1, $2, $3::jsonb, $4)`,
      [
        id,
        params.htmlContent,
        JSON.stringify(params.variablesDefinition),
        params.createdByUserId,
      ]
    );

    await client.query("COMMIT");
    return { id, version: 1 };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function createTemplateVersion(params: {
  templateId: string;
  name?: string;
  description?: string | null;
  language?: TemplateLanguage;
  isActive?: boolean;
  htmlContent: string;
  variablesDefinition: TemplateVariableDefinition[];
  createdByUserId: string;
}): Promise<{ id: string; version: number }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = await client.query<{ v: string }>(
      `SELECT COALESCE(MAX(version), 0)::text as v
       FROM template_versions
       WHERE template_id = $1`,
      [params.templateId]
    );

    const nextVersion = Number(current.rows[0]?.v ?? "0") + 1;

    const hasName = typeof params.name === "string";
    const hasDescription = typeof params.description !== "undefined";
    const hasLanguage = typeof params.language === "string";
    const hasIsActive = typeof params.isActive === "boolean";

    if (hasName || hasDescription || hasLanguage || hasIsActive) {
      await client.query(
        `UPDATE template_families
         SET
           name = CASE WHEN $2::boolean THEN $3 ELSE name END,
           description = CASE WHEN $4::boolean THEN $5 ELSE description END,
           language = CASE WHEN $6::boolean THEN $7 ELSE language END,
           is_active = CASE WHEN $8::boolean THEN $9 ELSE is_active END
         WHERE id = $1`,
        [
          params.templateId,
          hasName,
          hasName ? params.name : null,
          hasDescription,
          hasDescription ? params.description : null,
          hasLanguage,
          hasLanguage ? params.language : null,
          hasIsActive,
          hasIsActive ? params.isActive : null,
        ]
      );
    }

    await client.query(
      `INSERT INTO template_versions (template_id, version, html_content, variables_definition, created_by_user_id)
       VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [
        params.templateId,
        nextVersion,
        params.htmlContent,
        JSON.stringify(params.variablesDefinition),
        params.createdByUserId,
      ]
    );

    await client.query("COMMIT");
    return { id: params.templateId, version: nextVersion };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function updateTemplateFamily(params: {
  templateId: string;
  name?: string;
  description?: string | null;
  language?: TemplateLanguage;
  isActive?: boolean;
}): Promise<void> {
  const pool = getPool();

  const hasName = typeof params.name === "string";
  const hasDescription = typeof params.description !== "undefined";
  const hasLanguage = typeof params.language === "string";
  const hasIsActive = typeof params.isActive === "boolean";

  if (!hasName && !hasDescription && !hasLanguage && !hasIsActive) return;

  await pool.query(
    `UPDATE template_families
     SET
       name = CASE WHEN $2::boolean THEN $3 ELSE name END,
       description = CASE WHEN $4::boolean THEN $5 ELSE description END,
       language = CASE WHEN $6::boolean THEN $7 ELSE language END,
       is_active = CASE WHEN $8::boolean THEN $9 ELSE is_active END
     WHERE id = $1`,
    [
      params.templateId,
      hasName,
      hasName ? params.name : null,
      hasDescription,
      hasDescription ? params.description : null,
      hasLanguage,
      hasLanguage ? params.language : null,
      hasIsActive,
      hasIsActive ? params.isActive : null,
    ]
  );
}

export async function setTemplateActive(params: {
  templateId: string;
  isActive: boolean;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE template_families SET is_active = $2 WHERE id = $1`,
    [params.templateId, params.isActive]
  );
}
