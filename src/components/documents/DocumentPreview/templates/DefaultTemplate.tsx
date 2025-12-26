export type PdfTemplateData = {
  referenceNo: string;
  barcodeId: string;
  ownerFullName: string;
  ownerIdentityNo: string;
  ownerBirthDate: string;
  universityName: string;
  dormName: string | null;
  dormAddress: string | null;
  issueDate: string;
  footerDatetime: string;
  requesterLabel: string;
  priceLabel: string;
  verificationUrl: string;
  verificationPath: string;
  qrDataUrl: string;
  barcodeDataUrl: string;
  stampDataUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export function renderDefaultTemplateHtml(data: PdfTemplateData): string {
  const css = `
    @page { size: A4; margin: 20mm; }
    html, body { padding: 0; margin: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #111; }
    * { box-sizing: border-box; }

    .page { position: relative; width: 210mm; min-height: 297mm; }

    .header { padding-bottom: 8mm; border-bottom: 1px solid #ddd; }
    .header-title { font-size: 14pt; font-weight: 700; letter-spacing: 0.2px; }
    .header-sub { margin-top: 2mm; font-size: 10pt; color: #444; }

    .stamp { position: absolute; top: 0; right: 0; width: 26mm; height: 26mm; }
    .stamp img { width: 100%; height: 100%; object-fit: contain; }

    .body { padding-top: 8mm; padding-bottom: 32mm; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
    .field { display: grid; gap: 1mm; }
    .label { font-size: 9pt; color: #555; }
    .value { font-size: 11pt; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 10pt; }

    .footer { position: absolute; left: 0; right: 0; bottom: 0; padding-top: 5mm; border-top: 1px solid #ddd; }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; align-items: end; }

    .verify { font-size: 9pt; color: #444; }
    .verify a { color: #111; text-decoration: none; }

    .qr { display: grid; justify-items: end; gap: 2mm; }
    .qr img { width: 28mm; height: 28mm; }

    .barcode { display: grid; justify-items: start; gap: 2mm; }
    .barcode img { height: 14mm; width: auto; }

    .small { font-size: 9pt; color: #444; }
  `;

  const dormName = data.dormName ?? "-";
  const dormAddress = data.dormAddress ?? "-";

  return `
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(data.referenceNo)}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="page">
          <div class="stamp">
            <img src="${escapeAttr(data.stampDataUrl)}" alt="stamp" />
          </div>

          <header class="header">
            <div class="header-title">Document</div>
            <div class="header-sub">
              Reference: <span class="mono">${escapeHtml(
                data.referenceNo
              )}</span>
            </div>
          </header>

          <main class="body">
            <div class="grid">
              <div class="field"><div class="label">Owner full name</div><div class="value">${escapeHtml(
                data.ownerFullName
              )}</div></div>
              <div class="field"><div class="label">Owner ID number</div><div class="value mono">${escapeHtml(
                data.ownerIdentityNo
              )}</div></div>
              <div class="field"><div class="label">Birth date</div><div class="value">${escapeHtml(
                data.ownerBirthDate
              )}</div></div>
              <div class="field"><div class="label">University</div><div class="value">${escapeHtml(
                data.universityName
              )}</div></div>
              <div class="field"><div class="label">Accommodation</div><div class="value">${escapeHtml(
                dormName
              )}</div></div>
              <div class="field"><div class="label">Address</div><div class="value">${escapeHtml(
                dormAddress
              )}</div></div>
              <div class="field"><div class="label">Issue date</div><div class="value">${escapeHtml(
                data.issueDate
              )}</div></div>
              <div class="field"><div class="label">Footer datetime</div><div class="value">${escapeHtml(
                data.footerDatetime
              )}</div></div>
              <div class="field"><div class="label">Requester</div><div class="value">${escapeHtml(
                data.requesterLabel
              )}</div></div>
              <div class="field"><div class="label">Price</div><div class="value">${escapeHtml(
                data.priceLabel
              )}</div></div>
              <div class="field"><div class="label">Barcode</div><div class="value mono">${escapeHtml(
                data.barcodeId
              )}</div></div>
              <div class="field"><div class="label">Verification</div><div class="value mono">${escapeHtml(
                data.verificationPath
              )}</div></div>
            </div>
          </main>

          <footer class="footer">
            <div class="footer-grid">
              <div class="barcode">
                <div class="small">Barcode</div>
                <img src="${escapeAttr(data.barcodeDataUrl)}" alt="barcode" />
                <div class="mono">${escapeHtml(data.barcodeId)}</div>
                <div class="small">Ref: <span class="mono">${escapeHtml(
                  data.referenceNo
                )}</span></div>
                <div class="verify">Verify: <a href="${escapeAttr(
                  data.verificationUrl
                )}">${escapeHtml(data.verificationUrl)}</a></div>
              </div>
              <div class="qr">
                <div class="small">QR</div>
                <img src="${escapeAttr(data.qrDataUrl)}" alt="qr" />
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  `;
}
