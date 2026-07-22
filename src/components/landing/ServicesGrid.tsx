import { Users, Link2, FileText, Send, Globe, ShieldCheck, type LucideIcon } from "lucide-react";
import { SERVICES, type ServiceItem } from "@/lib/mock-data";
import { Reveal } from "@/components/landing/Reveal";

const ICONS: Record<ServiceItem["icon"], LucideIcon> = {
  leads: Users,
  crm: Link2,
  reports: FileText,
  pixel: Send,
  domain: Globe,
  security: ShieldCheck,
};

export function ServicesGrid() {
  return (
    <section id="xizmatlar" className="mx-auto max-w-5xl px-6 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Bizning xizmatlar</h2>
        <p className="mt-3 text-muted">Facebook Leads avtomatizatsiyasidan boshlab, to&apos;liq marketing ekotizimi</p>
      </Reveal>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SERVICES.map((service, index) => {
          const Icon = ICONS[service.icon];
          return (
            <Reveal key={service.title} delayMs={index * 80}>
              <div className="h-full rounded-xl border border-border bg-surface p-6 hover:border-primary/40 transition-colors">
                <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm text-muted">{service.description}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
