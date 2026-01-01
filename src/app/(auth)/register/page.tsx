import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
   
  return <RegisterPageContent />;
}

async function RegisterPageContent() {
  const t = await getTranslations("auth.register");

  return (
    <main style={{ padding: 24 }}>
      <h1>{t("title")}</h1>
      <RegisterForm />

      <p style={{ marginTop: 16 }}>
        {t("alreadyHave")} <Link href="/login">{t("login")}</Link>
      </p>
    </main>
  );
}
