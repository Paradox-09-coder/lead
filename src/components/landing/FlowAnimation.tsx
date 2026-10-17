import { Zap, Send, Table2, Building2, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { getT } from "@/i18n/server";

const TARGETS = [
  { icon: Send, label: "Telegram" },
  { icon: Table2, label: "Google Sheets" },
  { icon: Building2, label: "Bitrix24" },
];

export async function FlowAnimation() {
  const { t } = await getT();

  return (
    <section id="qanday-ishlaydi" className="mx-auto max-w-5xl px-6 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("flow.title")}</h2>
        <p className="mt-3 text-muted max-w-lg mx-auto">{t("flow.subtitle")}</p>
      </Reveal>

      <div className="mt-14 flex flex-col md:flex-row items-center justify-center gap-6">
        <Reveal delayMs={0}>
          <div className="rounded-xl border border-border bg-surface p-5 w-56">
            <div className="size-10 rounded-lg bg-[#1877F2] flex items-center justify-center text-white font-bold text-sm">
              f
            </div>
            <p className="mt-3 font-medium text-sm">Facebook Lead Ads</p>
            <p className="text-xs text-muted mt-1">{t("flow.userFills")}</p>
          </div>
        </Reveal>

        <Reveal delayMs={150}>
          <ArrowRight className="hidden md:block size-5 text-muted" />
          <div className="md:hidden h-6 w-px bg-border mx-auto" />
        </Reveal>

        <Reveal delayMs={300}>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-5 w-56 text-center">
            <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto">
              <Zap className="size-5 text-primary" />
            </div>
            <p className="mt-3 font-medium text-sm">LeadSync</p>
            <p className="text-xs text-muted mt-1">{t("flow.sending")}</p>
          </div>
        </Reveal>

        <Reveal delayMs={450}>
          <ArrowRight className="hidden md:block size-5 text-muted" />
          <div className="md:hidden h-6 w-px bg-border mx-auto" />
        </Reveal>

        <Reveal delayMs={600}>
          <div className="rounded-xl border border-border bg-surface p-5 w-56 space-y-2">
            {TARGETS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="size-4 text-success" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
