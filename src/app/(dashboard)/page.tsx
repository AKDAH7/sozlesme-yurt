import { getTranslations } from "next-intl/server";

export default function Home() {
  // This page is a Server Component.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return <HomeContent />;
}

async function HomeContent() {
  const tApp = await getTranslations("app");
  const t = await getTranslations("dashboard.home");
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">{tApp("controlPanel")}</h1>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
    </section>
  );
}
