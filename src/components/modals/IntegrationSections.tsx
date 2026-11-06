"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, EyeOff, ListChecks } from "lucide-react";
import { useT } from "@/i18n/client";

export type IntegrationView = "main" | "fields" | "hidden";

function SectionButton({
  icon,
  title,
  summary,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  summary?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {summary && <span className="mt-0.5 block truncate text-xs text-muted">{summary}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </button>
  );
}

// The two buttons under the integration's basic settings: they open the
// Facebook form fields mapping and the hidden fields.
export function IntegrationSectionButtons({
  disabled,
  fieldsSummary,
  hiddenSummary,
  onOpen,
}: {
  // Both views need a CRM to read stages and fields from.
  disabled: boolean;
  fieldsSummary?: string;
  hiddenSummary?: string;
  onOpen: (view: Exclude<IntegrationView, "main">) => void;
}) {
  const { t } = useT();
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SectionButton
          icon={<ListChecks className="size-4" />}
          title={t("integrationsPage.formFieldsButton")}
          summary={fieldsSummary}
          disabled={disabled}
          onClick={() => onOpen("fields")}
        />
        <SectionButton
          icon={<EyeOff className="size-4" />}
          title={t("integrationsPage.hiddenButton")}
          summary={hiddenSummary ?? t("integrationsPage.hiddenSummary")}
          disabled={disabled}
          onClick={() => onOpen("hidden")}
        />
      </div>
      {disabled && <p className="mt-2 text-xs text-muted">{t("integrationsPage.hiddenSelectTarget")}</p>}
    </div>
  );
}

// Wraps one of the two views: a way back to the main settings on top and a
// "done" button at the bottom. Nothing is saved here — the choices stay in the
// dialog and are saved together with the main settings.
export function IntegrationSubView({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const { t } = useT();
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t("integrationsPage.back")}
      </button>
      {children}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          {t("integrationsPage.done")}
        </button>
      </div>
    </div>
  );
}
