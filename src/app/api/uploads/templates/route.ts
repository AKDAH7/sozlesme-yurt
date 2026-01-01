import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { requirePermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads", "templates");

const ALLOWED_CONTENT_TYPES = new Map<string, string>([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function safeExtFromFilename(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (
    ext === ".png" ||
    ext === ".jpg" ||
    ext === ".jpeg" ||
    ext === ".webp" ||
    ext === ".gif"
  ) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  return "";
}

export async function POST(request: Request) {
  try {
    await requirePermission("templates:manage");

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { ok: false, error: "file is required" },
        { status: 400 }
      );
    }

    if (!file.size) {
      return Response.json(
        { ok: false, error: "file is empty" },
        { status: 400 }
      );
    }

    // Basic upper bound to avoid accidental huge uploads.
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        { ok: false, error: "file is too large (max 5MB)" },
        { status: 413 }
      );
    }

    const contentType = file.type || "";
    const ext =
      ALLOWED_CONTENT_TYPES.get(contentType) || safeExtFromFilename(file.name);

    if (!ext) {
      return Response.json(
        { ok: false, error: "Unsupported image type" },
        { status: 415 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const key = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, key);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buf);

    return Response.json({
      ok: true,
      key,
      url: `/api/uploads/templates/${encodeURIComponent(key)}`,
    });
  } catch (err) {
    const anyErr = err as { status?: number; message?: string } | null;
    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to upload image" },
      { status }
    );
  }
}
