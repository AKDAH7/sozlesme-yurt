"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type FormValues = {
  fullName: string;
  email: string;
  password: string;
};

export function RegisterForm() {
  const t = useTranslations("auth.register");

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    if (!response.ok || !data?.ok) {
      setError(data?.error ?? t("errors.accountCreationFailed"));
      return;
    }

    router.replace("/");
    router.refresh();
  });

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gap: 12, maxWidth: 420 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span>{t("fields.fullName")}</span>
        <Input
          autoComplete="name"
          {...register("fullName", { required: true })}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t("fields.email")}</span>
        <Input
          type="email"
          autoComplete="email"
          {...register("email", { required: true })}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>{t("fields.password")}</span>
        <Input
          type="password"
          autoComplete="new-password"
          {...register("password", { required: true, minLength: 8 })}
        />
      </label>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("actions.creating") : t("actions.createAccount")}
      </Button>
    </form>
  );
}
