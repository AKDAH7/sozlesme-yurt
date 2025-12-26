import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  getPreferredLocaleFromHeaders,
  isLocale,
  type Locale,
} from "@/lib/i18n/locales";

import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";
import trMessages from "../../messages/tr.json";

const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    (isLocale(cookieLocale) && (cookieLocale as Locale)) ||
    getPreferredLocaleFromHeaders(headerStore.get("accept-language")) ||
    defaultLocale;

  // Note: Static imports are more resilient across build tools and server runtimes
  // than a variable dynamic import.
  const messagesByLocale: Record<Locale, Record<string, any>> = {
    ar: arMessages as Record<string, any>,
    en: enMessages as Record<string, any>,
    tr: trMessages as Record<string, any>,
  };

  const messages = messagesByLocale[locale] ?? messagesByLocale[defaultLocale];

  return {
    locale,
    messages,
  };
});
