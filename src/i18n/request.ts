import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  defaultLocale,
  getPreferredLocaleFromHeaders,
  isLocale,
  type Locale,
} from "@/lib/i18n/locales";

const LOCALE_COOKIE = "NEXT_LOCALE";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale =
    (isLocale(cookieLocale) && (cookieLocale as Locale)) ||
    getPreferredLocaleFromHeaders(headerStore.get("accept-language")) ||
    defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
