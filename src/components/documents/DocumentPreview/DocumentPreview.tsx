"use client";

import * as React from "react";

export function DocumentPreview(props: {
  html: string;
  className?: string;
  title?: string;
}) {
  return (
    <iframe
      title={props.title ?? "Document preview"}
      className={props.className ?? "h-[75vh] w-full rounded-lg border"}
      srcDoc={props.html}
    />
  );
}
