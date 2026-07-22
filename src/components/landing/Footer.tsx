import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/Logo";

const QUICK_LINKS = [
  { href: "#xizmatlar", label: "Xizmatlar" },
  { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
  { href: "#narxlar", label: "Narxlar" },
  { href: "/register", label: "Boshlash" },
  { href: "/login", label: "Kirish" },
];

const LEGAL_LINKS = [
  { href: "#", label: "Maxfiylik siyosati" },
  { href: "#", label: "Xizmat shartlari" },
  { href: "#", label: "Ma'lumotlarni o'chirish" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold">LeadSync</span>
          </div>
          <p className="mt-2 text-sm text-muted">Facebook lidlarini avtomatik CRM&apos;ga yuboruvchi xizmat.</p>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Tezkor havolalar</p>
          <ul className="mt-3 space-y-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Huquqiy</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-sm text-muted hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Bog&apos;lanish</p>
          <a
            href="mailto:info@leadsync.uz"
            className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <Mail className="size-4" />
            info@leadsync.uz
          </a>
        </div>
      </div>

      <div className="border-t border-border py-6">
        <p className="text-center text-xs text-muted">© 2026 LeadSync. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>
  );
}
