"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { Select } from "@/components/ui/Select";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import {
  fetchFacebookForms,
  fetchCrmStages,
  type Connection,
  type FacebookLeadForm,
  type CrmStage,
} from "@/lib/connections-client";
import type { CreateIntegrationInput } from "@/lib/integrations-client";
import { useT } from "@/i18n/client";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

const STEP_KEYS = ["integrationsPage.stepSource", "integrationsPage.stepSettings", "integrationsPage.stepTarget"];

export function NewIntegrationModal({
  connections,
  onClose,
  onCreate,
}: {
  connections: Connection[];
  onClose: () => void;
  onCreate: (input: CreateIntegrationInput) => Promise<void>;
}) {
  const { t } = useT();
  const [step, setStep] = useState(0);

  const [source, setSource] = useState<"facebook" | "webhook" | "">("");
  const [facebookConnectionId, setFacebookConnectionId] = useState("");
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [target, setTarget] = useState("");
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageId, setStageId] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const facebookConnections = connections.filter((c) => c.platform === "facebook");
  const selectedConnection = facebookConnections.find((c) => c._id === facebookConnectionId);
  const crmConnections = connections.filter((c) => c.platform !== "facebook");
  const targetConnection = crmConnections.find((c) => c._id === target);

  useEffect(() => {
    if (!facebookConnectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingForms(true);
    setFormsError(null);
    fetchFacebookForms(facebookConnectionId)
      .then(setForms)
      .catch((err) => setFormsError(err instanceof Error ? err.message : t("integrationsPage.formsError")))
      .finally(() => setIsLoadingForms(false));
  }, [facebookConnectionId]);

  function handleFacebookConnectionChange(id: string) {
    setFacebookConnectionId(id);
    setForms([]);
    setFormId("");
    setFormsError(null);
  }

  useEffect(() => {
    const connection = crmConnections.find((c) => c._id === target);
    if (!connection) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingStages(true);
    setStagesError(null);
    fetchCrmStages(connection._id)
      .then(setStages)
      .catch((err) => setStagesError(err instanceof Error ? err.message : t("integrationsPage.stagesError")))
      .finally(() => setIsLoadingStages(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the selected target id changes
  }, [target]);

  function handleTargetChange(id: string) {
    setTarget(id);
    setStages([]);
    setStageId("");
    setStagesError(null);
  }

  const canGoNext =
    (step === 0 && source !== "" && (source !== "facebook" || (facebookConnectionId !== "" && formId !== ""))) ||
    (step === 1 && formName !== "" && telegramChatId !== "") ||
    step === 2;

  async function handleSave() {
    if (source !== "facebook" || !selectedConnection || !formId) {
      setSaveError(t("integrationsPage.needFbForm"));
      return;
    }
    if (!targetConnection) {
      setSaveError(t("integrationsPage.needCrm"));
      return;
    }

    const selectedForm = forms.find((f) => f.id === formId);
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate({
        name: formName || t("integrationsPage.defaultName"),
        facebookConnectionId: selectedConnection._id,
        formId,
        formName: selectedForm?.name ?? formId,
        targetConnectionId: targetConnection._id,
        stageId: stageId || undefined,
        duplicateCheck,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("integrationsPage.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={t("integrationsPage.modalTitle")} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex items-center mb-8">
        {STEP_KEYS.map((key, index) => (
          <div key={key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < step
                    ? "bg-success text-white"
                    : index === step
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-muted"
                }`}
              >
                {index < step ? <Check className="size-4" /> : index + 1}
              </div>
              <span className="text-xs text-muted whitespace-nowrap">{t(key)}</span>
            </div>
            {index < STEP_KEYS.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${index < step ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.sourceLabel")} <span className="text-danger">*</span>
            </label>
            <Select
              value={source}
              onChange={(value) => setSource(value as typeof source)}
            >
              <option value="" className="bg-surface">
                {t("integrationsPage.sourcePlaceholder")}
              </option>
              <option value="facebook" className="bg-surface">
                {t("integrationsPage.sourceFacebook")}
              </option>
              <option value="webhook" className="bg-surface">
                {t("integrationsPage.sourceWebhook")}
              </option>
            </Select>
          </div>

          {source === "facebook" && (
            <>
              {facebookConnections.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">{t("integrationsPage.fbPage")}</label>
                    <Select
                      value={facebookConnectionId}
                      onChange={(value) => handleFacebookConnectionChange(value)}
                    >
                      <option value="" className="bg-surface">
                        {t("integrationsPage.fbPagePlaceholder")}
                      </option>
                      {facebookConnections.map((c) => (
                        <option key={c._id} value={c._id} className="bg-surface">
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t("integrationsPage.form")}</label>
                    <Select
                      value={formId}
                      onChange={(value) => setFormId(value)}
                      disabled={!facebookConnectionId || isLoadingForms}
                    >
                      <option value="" className="bg-surface">
                        {isLoadingForms ? t("common.loading") : t("integrationsPage.formPlaceholder")}
                      </option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id} className="bg-surface">
                          {f.name}
                        </option>
                      ))}
                    </Select>
                    {isLoadingForms && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <RefreshCw className="size-3 animate-spin" />
                        {t("integrationsPage.formsLoading")}
                      </p>
                    )}
                    {formsError && <p className="mt-1.5 text-xs text-danger">{formsError}</p>}
                    {!isLoadingForms && !formsError && facebookConnectionId && forms.length === 0 && (
                      <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.formsEmpty")}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-warning">
                  {t("integrationsPage.connectFbFirst")}{" "}
                  <Link href="/dashboard/connections" className="underline">
                    {t("integrationsPage.connectFbLink")}
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.formName")} <span className="text-danger">*</span>
            </label>
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder={t("integrationsPage.formNamePlaceholder")}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.telegramChatId")} <span className="text-danger">*</span>
            </label>
            <input
              value={telegramChatId}
              onChange={(event) => setTelegramChatId(event.target.value)}
              placeholder="1304074546"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.telegramHint")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">{t("integrationsPage.botLabel")}</label>
            <Select value="default" onChange={() => {}}>
              <option value="default" className="bg-surface">{t("integrationsPage.botDefault")}</option>
            </Select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.targetLabel")} <span className="text-danger">*</span>
            </label>
            <Select
              value={target}
              onChange={(value) => handleTargetChange(value)}
            >
              <option value="" className="bg-surface">
                {t("integrationsPage.targetPlaceholder")}
              </option>
              {crmConnections.map((c) => (
                <option key={c._id} value={c._id} className="bg-surface">
                  {platformName(c.platform)} — {c.label}
                </option>
              ))}
            </Select>
            {crmConnections.length === 0 && (
              <p className="mt-1.5 text-xs text-muted">
                {t("integrationsPage.noCrm")}{" "}
                <Link href="/dashboard/connections" className="underline">
                  {t("integrationsPage.noCrmLink")}
                </Link>{" "}
                {t("integrationsPage.noCrmSuffix")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">{t("integrationsPage.stageLabel")}</label>
            <Select
              value={stageId}
              onChange={(value) => setStageId(value)}
              disabled={!target || isLoadingStages}
            >
              <option value="" className="bg-surface">
                {!target
                  ? t("integrationsPage.stageNeedTarget")
                  : isLoadingStages
                    ? t("common.loading")
                    : t("integrationsPage.stagePlaceholder")}
              </option>
              {stages.map((s) => (
                <option key={s.id} value={s.id} className="bg-surface">
                  {s.name}
                </option>
              ))}
            </Select>
            {isLoadingStages && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <RefreshCw className="size-3 animate-spin" />
                {t("integrationsPage.stagesLoading")}
              </p>
            )}
            {stagesError && <p className="mt-1.5 text-xs text-danger">{stagesError}</p>}
            {!isLoadingStages && !stagesError && target && stages.length === 0 && (
              <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.stagesEmpty")}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">{t("integrationsPage.assigneeLabel")}</label>
            <Select value="default" onChange={() => {}}>
              <option value="default" className="bg-surface">{t("integrationsPage.assigneeDefault")}</option>
            </Select>
            <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.assigneeHint")}</p>
          </div>

          <label className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <span className="text-sm">{t("integrationsPage.duplicateCheck")}</span>
            <button
              type="button"
              onClick={() => setDuplicateCheck((value) => !value)}
              className={`w-10 h-6 shrink-0 rounded-full transition-colors relative ${
                duplicateCheck ? "bg-primary" : "bg-surface-hover"
              }`}
            >
              <span
                className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform ${
                  duplicateCheck ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {saveError && <p className="mt-4 text-sm text-danger">{saveError}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          {t("integrationsPage.back")}
        </button>
        {step < STEP_KEYS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {t("integrationsPage.next")}
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? t("integrationsPage.saving") : t("integrationsPage.save")}
          </button>
        )}
      </div>
    </Modal>
  );
}
