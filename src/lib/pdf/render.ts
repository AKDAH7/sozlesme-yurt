import crypto from "crypto";
import fs from "fs/promises";
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
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(params.html, { waitUntil: "networkidle0" });
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

export async function writePdfToLocalStorage(params: {
  documentId: string;
  pdfBuffer: Buffer;
}): Promise<{ filePath: string }> {
  const dir = path.join(process.cwd(), "storage", "pdfs");
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${params.documentId}.pdf`);
  await fs.writeFile(filePath, params.pdfBuffer);
  return { filePath };
}

export async function readPdfFromLocalStorage(params: {
  documentId: string;
}): Promise<Buffer> {
  const filePath = path.join(
    process.cwd(),
    "storage",
    "pdfs",
    `${params.documentId}.pdf`
  );
  return fs.readFile(filePath);
}
