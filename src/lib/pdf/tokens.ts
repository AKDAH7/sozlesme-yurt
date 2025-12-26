export function buildVerificationPath(token: string): string {
  return `/verify/${token}`;
}

export function buildVerificationUrl(params: {
  origin: string;
  token: string;
}): string {
  const origin = params.origin.replace(/\/$/, "");
  return `${origin}${buildVerificationPath(params.token)}`;
}
