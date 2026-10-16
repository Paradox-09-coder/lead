"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { useT } from "@/i18n/client";
import { fetchConnections, fetchCrmStages, type Connection, type CrmStage } from "@/lib/connections-client";

export interface WebFormItem {
  _id: string;
  name: string;
  source: string;
  target: string;
  url: string;
  createdAt: string;
}

const SOURCES = ["telegram", "instagram", "facebook", "website", "other"] as const;

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50";

function platformName(platform: string): string {
  return platform === "bitrix24" ? "Bitrix24" : platform === "amocrm" ? "amoCRM / Kommo" : platform;
}

export function NewWebFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (form: WebFormItem) => void;
}) {
  const { t } = useT();

  const [source, setSource] = useState("");
  const [name, setName] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [crmConnections, setCrmConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [target, setTarget] = useState("");
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageId, setStageId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections()
      .then((connections) => setCrmConnections(connections.filter((c) => c.platform === "bitrix24" || c.platform === "amocrm")))
      .catch(() => setCrmConnections([]))
      .finally(() => setIsLoadingConnections(false));
  }, []);

  useEffect(() => {
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingStages(true);
    setStagesError(null);
    fetchCrmStages(target)
      .then(setStages)
      .catch((err) => setStagesError(err instanceof Error ? err.message : t("webForms.stagesError")))
      .finally(() => setIsLoadingStages(false));
  }, [target, t]);

  function handleTargetChange(id: string) {
    setTarget(id);
    setStages([]);
    setStageId("");
    setStagesError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          name,
          utmMedium,
          utmCampaign,
          utmContent,
          targetConnectionId: target,
          stageId: stageId || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? t("webForms.createError"));
      }
      onCreated((await response.json()) as WebFormItem);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("webForms.createError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={t("webForms.modalTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium">
            {t("webForms.sourceLabel")} <span className="text-danger">*</span>
          </label>
          <select value={source} onChange={(event) => setSource(event.target.value)} required className={INPUT_CLASS}>
            <option value="" className="bg-surface">
              {t("webForms.sourcePlaceholder")}
            </option>
            {SOURCES.map((s) => (
              <option key={s} value={s} className="bg-surface">
                {t(`webForms.source_${s}`)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">{t("webForms.sourceHint")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            {t("webForms.nameLabel")} <span className="text-danger">*</span>
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            placeholder={t("webForms.namePlaceholder")}
            className={INPUT_CLASS}
          />
          <p className="mt-1.5 text-xs text-muted">{t("webForms.nameHint")}</p>
        </div>

        <div className="rounded-md border border-border p-4 space-y-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{t("webForms.utmTitle")}</p>
          <div>
            <label className="block text-sm font-medium">UTM Medium</label>
            <input
              value={utmMedium}
              onChange={(event) => setUtmMedium(event.target.value)}
              maxLength={120}
              placeholder={t("webForms.utmMediumPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">UTM Campaign</label>
            <input
              value={utmCampaign}
              onChange={(event) => setUtmCampaign(event.target.value)}
              maxLength={120}
              placeholder={t("webForms.utmCampaignPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">UTM Content</label>
            <input
              value={utmContent}
              onChange={(event) => setUtmContent(event.target.value)}
              maxLength={120}
              placeholder={t("webForms.utmContentPlaceholder")}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">
            {t("webForms.targetLabel")} <span className="text-danger">*</span>
          </label>
          <select
            value={target}
            onChange={(event) => handleTargetChange(event.target.value)}
            required
            disabled={isLoadingConnections}
            className={INPUT_CLASS}
          >
            <option value="" className="bg-surface">
              {isLoadingConnections ? t("common.loading") : t("webForms.targetPlaceholder")}
            </option>
            {crmConnections.map((c) => (
              <option key={c._id} value={c._id} className="bg-surface">
                {platformName(c.platform)} — {c.label}
              </option>
            ))}
          </select>
          {!isLoadingConnections && crmConnections.length === 0 && (
            <p className="mt-1.5 text-xs text-muted">
              {t("webForms.noCrm")}{" "}
              <Link href="/dashboard/connections" className="underline">
                {t("webForms.noCrmLink")}
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">{t("webForms.stageLabel")}</label>
          <select
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
            disabled={!target || isLoadingStages}
            className={INPUT_CLASS}
          >
            <option value="" className="bg-surface">
              {!target
                ? t("webForms.stageNeedTarget")
                : isLoadingStages
                  ? t("common.loading")
                  : t("webForms.stagePlaceholder")}
            </option>
            {stages.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface">
                {s.name}
              </option>
            ))}
          </select>
          {isLoadingStages && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <RefreshCw className="size-3 animate-spin" />
              {t("webForms.stagesLoading")}
            </p>
          )}
          {stagesError && <p className="mt-1.5 text-xs text-danger">{stagesError}</p>}
        </div>

        {saveError && <p className="text-sm text-danger">{saveError}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? t("webForms.creating") : t("webForms.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
