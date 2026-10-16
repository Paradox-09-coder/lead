import { Users, Link2, FileText, Send, Globe, ShieldCheck, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { getT } from "@/i18n/server";

type ServiceIcon = "leads" | "crm" | "reports" | "pixel" | "domain" | "security";

const ICONS: Record<ServiceIcon, LucideIcon> = {
  leads: Users,
  crm: Link2,
  reports: FileText,
  pixel: Send,
  domain: Globe,
  security: ShieldCheck,
};

const SERVICE_KEYS: ServiceIcon[] = ["leads", "crm", "reports", "pixel", "domain", "security"];

export async function ServicesGrid() {
  const { t } = await getT();

  return (
    <section id="xizmatlar" className="mx-auto max-w-5xl px-6 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("services.title")}</h2>
        <p className="mt-3 text-muted">{t("services.subtitle")}</p>
      </Reveal>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SERVICE_KEYS.map((key, index) => {
          const Icon = ICONS[key];
          return (
            <Reveal key={key} delayMs={index * 80}>
              <div className="h-full rounded-xl border border-border bg-surface p-6 hover:border-primary/40 transition-colors">
                <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{t(`services.item.${key}Title`)}</h3>
                <p className="mt-2 text-sm text-muted">{t(`services.item.${key}Desc`)}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
