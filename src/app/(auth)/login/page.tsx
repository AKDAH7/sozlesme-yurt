import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>
      <LoginForm />

      <p style={{ marginTop: 16 }}>
        New here? <Link href="/register">Create an account</Link>
      </p>
    </main>
  );
}
