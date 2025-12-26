import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

import puppeteer from "puppeteer";

export function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function renderHtmlToPdfBuffer(params: {
  html: string;
  marginMm?: { top: number; right: number; bottom: number; left: number };
}): Promise<Buffer> {
  const margin = params.marginMm ?? {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  };
  const isVercel = process.env.VERCEL === "1";

  const browser = isVercel
    ? await (async () => {
        const chromium = (await import("@sparticuz/chromium")).default;
        const puppeteerCore = (await import("puppeteer-core")).default;

        const executablePath = await chromium.executablePath();
        if (!executablePath) {
          throw new Error(
            "Chromium executablePath() returned empty. Ensure @sparticuz/chromium assets are included in the Vercel deployment."
          );
        }

        return puppeteerCore.launch({
          headless: true,
          executablePath,
          args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
          ],
          defaultViewport: { width: 1280, height: 720 },
        });
      })()
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
  try {
    const page = await browser.newPage();
    await page.setContent(params.html, { waitUntil: "networkidle2" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: `${margin.top}mm`,
        right: `${margin.right}mm`,
        bottom: `${margin.bottom}mm`,
        left: `${margin.left}mm`,
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function getLocalPdfDir(): string {
  // On Vercel, the project directory is read-only; only /tmp is writable.
  if (process.env.VERCEL === "1") {
    return path.join(os.tmpdir(), "sozlesme-yurt", "pdfs");
  }
  return path.join(process.cwd(), "storage", "pdfs");
}

export async function writePdfToLocalStorage(params: {
  documentId: string;
  pdfBuffer: Buffer;
}): Promise<{ filePath: string }> {
  const dir = getLocalPdfDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${params.documentId}.pdf`);
  await fs.writeFile(filePath, params.pdfBuffer);
  return { filePath };
}

export async function readPdfFromLocalStorage(params: {
  documentId: string;
}): Promise<Buffer> {
  const filePath = path.join(getLocalPdfDir(), `${params.documentId}.pdf`);
  return fs.readFile(filePath);
}
