import Link from "next/link";

import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Create account</h1>
      <RegisterForm />

      <p style={{ marginTop: 16 }}>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </main>
  );
}
