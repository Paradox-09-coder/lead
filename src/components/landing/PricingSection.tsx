"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { useT } from "@/i18n/client";

type TierId = "starter" | "professional" | "business" | "enterprise";

// Translation-ready pricing data: priceAmount is a plain number so we can
// recompute yearly; the display strings come from the dict.
const TIERS: Array<{
  id: TierId;
  priceAmount: number;
  highlighted?: boolean;
  quotaKey: string;
  featureKeys: string[];
}> = [
  {
    id: "starter",
    priceAmount: 0,
    quotaKey: "pricing.quota.k1",
    featureKeys: [
      "pricing.feature.leads1k",
      "pricing.feature.fb1",
      "pricing.feature.unlimitedProducts",
      "pricing.feature.basicAnalytics",
    ],
  },
  {
    id: "professional",
    priceAmount: 49000,
    quotaKey: "pricing.quota.k5",
    featureKeys: [
      "pricing.feature.leads5k",
      "pricing.feature.fb5",
      "pricing.feature.unlimitedProducts",
      "pricing.feature.analyticsReports",
      "pricing.feature.customCrm",
    ],
  },
  {
    id: "business",
    priceAmount: 69000,
    highlighted: true,
    quotaKey: "pricing.quota.k10",
    featureKeys: [
      "pricing.feature.leads10k",
      "pricing.feature.fb100",
      "pricing.feature.unlimitedProducts",
      "pricing.feature.analyticsReports",
      "pricing.feature.customCrm",
    ],
  },
  {
    id: "enterprise",
    priceAmount: 89000,
    quotaKey: "pricing.quota.unlimited",
    featureKeys: [
      "pricing.feature.leadsUnlimited",
      "pricing.feature.fb100",
      "pricing.feature.unlimitedProducts",
      "pricing.feature.analyticsReports",
      "pricing.feature.customCrm",
    ],
  },
];

function formatPrice(amount: number): string {
  return amount.toLocaleString("en-US");
}

export function PricingSection() {
  const { t } = useT();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="narxlar" className="mx-auto max-w-6xl px-6 py-20">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("pricing.title")}</h2>
        <p className="mt-3 text-muted">{t("pricing.subtitle")}</p>

        <div className="mt-6 inline-flex items-center rounded-full border border-border bg-surface p-1 text-sm">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              billingCycle === "monthly" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            {t("pricing.monthly")}
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-1.5 rounded-full transition-colors ${
              billingCycle === "yearly" ? "bg-primary text-white" : "text-muted"
            }`}
          >
            {t("pricing.yearly")}
          </button>
        </div>
      </Reveal>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {TIERS.map((tier, index) => {
          const isFree = tier.priceAmount === 0;
          const displayPrice = isFree
            ? t("pricing.tier.free")
            : formatPrice(
                billingCycle === "monthly"
                  ? tier.priceAmount
                  : Math.round((tier.priceAmount * 0.85) / 1000) * 1000,
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
                    {t("pricing.popular")}
                  </span>
                )}
                <h3 className="font-semibold">{t(`pricing.tier.${tier.id}Name`)}</h3>
                <p className="mt-1 text-xs text-muted">{t(`pricing.tier.${tier.id}Desc`)}</p>

                <div className="mt-4">
                  <span className="text-2xl font-bold">{displayPrice}</span>
                  {!isFree && <span className="text-sm text-muted"> {t("pricing.tier.perMonth")}</span>}
                </div>
                <p className="text-xs text-muted">{t(tier.quotaKey)}</p>

                <ul className="mt-5 space-y-2.5">
                  {tier.featureKeys.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-success shrink-0 mt-0.5" />
                      <span className="text-muted">{t(key)}</span>
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
                  {t("pricing.select")}
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
