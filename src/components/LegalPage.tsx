import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getT } from "@/i18n/server";

export const CONTACT_EMAIL = "info@leadsync.uz";

export async function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = await getT();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-semibold text-lg">LeadSync</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t("legal.nav.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t("legal.nav.terms")}
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground transition-colors">
              {t("legal.nav.dataDeletion")}
            </Link>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("legal.updatedLabel")} {t("legal.updatedDate")}
          </p>

          <div className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a]:hover:underline">
            {children}
          </div>

          <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted sm:hidden">
            <Link href="/privacy" className="hover:text-foreground">
              {t("legal.nav.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              {t("legal.nav.terms")}
            </Link>
            <Link href="/data-deletion" className="hover:text-foreground">
              {t("legal.nav.dataDeletion")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// Replaces raw HTML in a translated string into real React children; used by
// the legal pages for strings that contain <strong>/<a>/<code> wrappers.
export function Html({ children }: { children: string }) {
  return <span dangerouslySetInnerHTML={{ __html: children }} />;
}
