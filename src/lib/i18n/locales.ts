export const locales = ["ar", "tr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

export function isRtl(locale: Locale): boolean {
  return locale === "ar";
}

function parseAcceptLanguageHeader(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => part.trim())
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean) as string[];
}

export function getPreferredLocaleFromHeaders(
  header: string | null
): Locale | null {
  const langs = parseAcceptLanguageHeader(header);
  for (const lang of langs) {
    const base = lang.toLowerCase().split("-")[0];
    if (base === "ar") return "ar";
    if (base === "tr") return "tr";
    if (base === "en") return "en";
  }
  return null;
}
