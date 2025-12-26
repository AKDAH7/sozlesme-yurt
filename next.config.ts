import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Puppeteer/Chromium must remain external and fully traced for serverless.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // @sparticuz/chromium reads its bundled binaries via fs at runtime.
  // Ensure output file tracing includes the package assets.
  outputFileTracingIncludes: {
    "**/*": ["./node_modules/@sparticuz/chromium/**"],
  },
};

export default withNextIntl(nextConfig);
