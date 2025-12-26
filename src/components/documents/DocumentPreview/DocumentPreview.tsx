"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export function DocumentPreview(props: {
  html: string;
  className?: string;
  title?: string;
}) {
  const t = useTranslations("documents.preview");

  return (
    <iframe
      title={props.title ?? t("title")}
      className={props.className ?? "h-[75vh] w-full rounded-lg border"}
      srcDoc={props.html}
    />
  );
}
