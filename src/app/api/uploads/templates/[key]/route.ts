import { readFile } from "fs/promises";
import path from "path";

import { requirePermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads", "templates");

function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function isSafeKey(key: string): boolean {
  // Avoid path traversal and odd characters.
  return (
    /^[a-zA-Z0-9._-]+$/.test(key) &&
    !key.includes("..") &&
    !key.includes("/") &&
    !key.includes("\\")
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> }
) {
  try {
    await requirePermission("documents:create");

    const { key } = await context.params;
    if (!isSafeKey(key)) {
      return Response.json(
        { ok: false, error: "Invalid key" },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, key);
    const buf = await readFile(filePath);

    const ext = path.extname(key);
    return new Response(buf, {
      headers: {
        "content-type": contentTypeForExt(ext),
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const anyErr = err as {
      code?: string;
      status?: number;
      message?: string;
    } | null;

    if (anyErr?.code === "ENOENT") {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const status =
      anyErr?.status && Number.isFinite(anyErr.status) ? anyErr.status : 500;

    return Response.json(
      { ok: false, error: anyErr?.message ?? "Failed to load image" },
      { status }
    );
  }
}
