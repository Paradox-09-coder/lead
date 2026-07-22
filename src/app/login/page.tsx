"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { loginUser } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await loginUser(email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirishda xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Logo />
          <span className="font-semibold text-lg">LeadSync</span>
        </Link>

        <div className="rounded-xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold text-center">Kirish</h1>
          <p className="mt-1 text-sm text-muted text-center">Hisobingizga kiring</p>

          <div className="mt-6">
            <GoogleAuthButton label="Google bilan kirish" />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-border" />
            yoki
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="password">
                Parol
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary hover:bg-primary-hover text-white py-2.5 font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Tekshirilmoqda..." : "Kirish"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Akkauntingiz yo&apos;qmi?{" "}
          <Link href="/register" className="text-foreground hover:text-primary transition-colors">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </div>
    </div>
  );
}
