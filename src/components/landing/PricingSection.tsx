"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "@/lib/mock-data";
import { Reveal } from "@/components/landing/Reveal";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="narxlar" className="mx-auto max-w-6xl px-6 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Narxlar</h2>
        <p className="mt-3 text-muted">Biznesingiz hajmiga mos tarifni tanlang</p>

        <div className="mt-6 inline-flex items-center rounded-full border border-border bg-surface p-1 text-sm">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              billingCycle === "monthly" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            Oylik
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              billingCycle === "yearly" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            Yillik (-15%)
          </button>
        </div>
      </Reveal>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {PRICING_TIERS.map((tier, index) => {
          const isFree = tier.price === "Bepul";
          const displayPrice =
            isFree || billingCycle === "monthly"
              ? tier.price
              : String(Math.round((Number(tier.price.replace(/,/g, "")) * 0.85) / 1000) * 1000).replace(
                  /\B(?=(\d{3})+(?!\d))/g,
                  ",",
                );

          return (
            <Reveal key={tier.id} delayMs={index * 80}>
              <div
                className={`h-full rounded-xl border p-6 relative ${
                  tier.highlighted ? "border-primary bg-primary/5" : "border-border bg-surface"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 right-4 rounded-full bg-primary text-white text-xs px-2.5 py-0.5">
                    Eng ommabop
                  </span>
                )}
                <h3 className="font-semibold">{tier.name}</h3>
                <p className="mt-1 text-xs text-muted">{tier.description}</p>

                <div className="mt-4">
                  <span className="text-2xl font-bold">{displayPrice}</span>
                  {tier.priceSuffix && <span className="text-sm text-muted"> {tier.priceSuffix}</span>}
                </div>
                <p className="text-xs text-muted">{tier.leadQuota}</p>

                <ul className="mt-5 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-success shrink-0 mt-0.5" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-6 block text-center rounded-md py-2.5 text-sm font-medium transition-colors ${
                    tier.highlighted
                      ? "bg-primary hover:bg-primary-hover text-white"
                      : "border border-border hover:bg-surface-hover"
                  }`}
                >
                  Tanlash
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
