import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default function LoginPage() {
   
  return <LoginPageContent />;
}

async function LoginPageContent() {
  const t = await getTranslations("auth.login");
  return (
    <main style={{ padding: 24 }}>
      <h1>{t("title")}</h1>
      <LoginForm />

      <p style={{ marginTop: 16 }}>
        {t("newHere")} <Link href="/register">{t("createAccount")}</Link>
      </p>
    </main>
  );
}
