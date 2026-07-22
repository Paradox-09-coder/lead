"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { registerUser } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await registerUser(fullName, email, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
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
          <h1 className="text-xl font-semibold text-center">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="mt-1 text-sm text-muted text-center">Bir necha soniyada bepul akkaunt oching</p>

          <div className="mt-6">
            <GoogleAuthButton label="Google bilan davom etish" />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-border" />
            yoki
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium" htmlFor="fullName">
                Ism
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
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
                minLength={6}
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
              {isSubmitting ? "Yuborilmoqda..." : "Ro'yxatdan o'tish"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Akkauntingiz bormi?{" "}
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">
            Kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
