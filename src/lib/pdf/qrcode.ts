import QRCode from "qrcode";

export async function generateQrPngDataUrl(params: {
  text: string;
  size?: number;
}): Promise<string> {
  const size =
    typeof params.size === "number" && Number.isFinite(params.size)
      ? Math.max(64, Math.floor(params.size))
      : 180;

  return QRCode.toDataURL(params.text, {
    type: "image/png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: size,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}
