import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getT } from "@/i18n/server";

const CONTACT_EMAIL = "info@leadsync.uz";

export async function Footer() {
  const { t } = await getT();

  const quickLinks = [
    { href: "#xizmatlar", label: t("footer.linkFeatures") },
    { href: "#qanday-ishlaydi", label: t("footer.linkHowItWorks") },
    { href: "#narxlar", label: t("footer.linkPricing") },
    { href: "/register", label: t("footer.linkStart") },
    { href: "/login", label: t("footer.linkLogin") },
  ];

  const legalLinks = [
    { href: "/privacy", label: t("footer.linkPrivacy") },
    { href: "/terms", label: t("footer.linkTerms") },
    { href: "/data-deletion", label: t("footer.linkDataDeletion") },
  ];

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold">LeadSync</span>
          </div>
          <p className="mt-2 text-sm text-muted">{t("footer.tagline")}</p>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("footer.quickLinks")}</p>
          <ul className="mt-3 space-y-2">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("footer.legal")}</p>
          <ul className="mt-3 space-y-2">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{t("footer.contact")}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <Mail className="size-4" />
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <p className="text-center text-xs text-muted">{t("footer.rights")}</p>
      </div>
    </footer>
  );
}
