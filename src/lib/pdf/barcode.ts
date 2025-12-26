import bwipjs from "bwip-js";

export async function generateBarcodePngDataUrl(params: {
  text: string;
  scale?: number;
  height?: number;
}): Promise<string> {
  const scale =
    typeof params.scale === "number" && Number.isFinite(params.scale)
      ? Math.max(1, Math.floor(params.scale))
      : 3;
  const height =
    typeof params.height === "number" && Number.isFinite(params.height)
      ? Math.max(6, Math.floor(params.height))
      : 12;

  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: params.text,
    scale,
    height,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });

  return `data:image/png;base64,${png.toString("base64")}`;
}
