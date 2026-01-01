import type { ReactNode } from "react";

import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { isRtl, type Locale } from "@/lib/i18n/locales";

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Note: this is a Server Component; locale/messages come from next-intl request config.
   
  return <LocaleLayout>{children}</LocaleLayout>;
}

async function LocaleLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
