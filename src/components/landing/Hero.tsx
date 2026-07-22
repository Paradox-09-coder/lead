import Link from "next/link";
import { Rocket, Video, Sparkles, Clock } from "lucide-react";

const STATS = [
  { icon: Sparkles, label: "40+", sublabel: "integratsiya" },
  { icon: Clock, label: "24/7", sublabel: "faol server" },
  { icon: Rocket, label: "Bepul", sublabel: "boshlash" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, rgba(10,14,26,0) 70%)",
        }}
      />
      <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted mb-6">
          <span className="size-1.5 rounded-full bg-success" />
          Yangi: amoCRM va Kommo integratsiyasi qo&apos;shildi
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-balance">
          Facebook lidlaringizni{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            avtomatik CRM&apos;ga
          </span>{" "}
          yuboring
        </h1>
        <p className="mt-5 text-lg text-muted max-w-xl mx-auto">
          Facebook lidlaringizni sekundlarda Telegram, Google Sheets va Bitrix24&apos;ga avtomatik yuboring.
          Qo&apos;l bilan nusxalash tarix bo&apos;ldi.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-6 py-3 font-medium transition-colors"
          >
            <Rocket className="size-4" />
            Bepul boshlash
          </Link>
          <a
            href="#qanday-ishlaydi"
            className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <Video className="size-4" />
            Qanday ishlashini ko&apos;rish
          </a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 sm:gap-14">
          {STATS.map(({ icon: Icon, label, sublabel }) => (
            <div key={sublabel} className="flex flex-col items-center gap-1">
              <Icon className="size-5 text-primary" />
              <span className="font-semibold">{label}</span>
              <span className="text-xs text-muted">{sublabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
