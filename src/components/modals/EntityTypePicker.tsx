"use client";

import { Handshake, UserRound } from "lucide-react";
import { cx } from "@/lib/cx";
import type { CrmEntity } from "@/lib/crm-entity";
import { useT } from "@/i18n/client";

// "What should be created in Bitrix24?": a lead card, or a contact with a deal ("sdelka"). Two cards rather than
// a dropdown so both options, and what each one means, are visible while connecting a form.
export function EntityTypePicker({
  value,
  onChange,
  disabled,
}: {
  value: CrmEntity;
  onChange: (entity: CrmEntity) => void;
  disabled?: boolean;
}) {
  const { t } = useT();
  const options: Array<{ value: CrmEntity; title: string; hint: string; icon: typeof UserRound }> = [
    { value: "lead", title: t("integrationsPage.entityLead"), hint: t("integrationsPage.entityLeadHint"), icon: UserRound },
    { value: "deal", title: t("integrationsPage.entityDeal"), hint: t("integrationsPage.entityDealHint"), icon: Handshake },
  ];

  return (
    <div>
      <p id="entity-type-label" className="block text-sm font-medium">
        {t("integrationsPage.entityLabel")}
      </p>
      <div role="radiogroup" aria-labelledby="entity-type-label" className="mt-1.5 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cx(
                "pressable flex items-start gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border hover:bg-surface-hover",
              )}
            >
              <span
                className={cx(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px]",
                  selected ? "bg-primary text-white" : "bg-surface-2 text-ink-2",
                )}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{option.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
