"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { Select } from "@/components/ui/Select";
import { FieldMappingEditor, suggestMapping } from "@/components/modals/FieldMappingEditor";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import {
  fetchCrmStages,
  fetchCrmFields,
  fetchFacebookForms,
  type Connection,
  type CrmStage,
  type CrmField,
  type FacebookQuestion,
} from "@/lib/connections-client";
import type { Integration, UpdateIntegrationInput } from "@/lib/integrations-client";
import { useT } from "@/i18n/client";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

export function EditIntegrationModal({
  integration,
  connections,
  onClose,
  onSave,
}: {
  integration: Integration;
  connections: Connection[];
  onClose: () => void;
  onSave: (input: UpdateIntegrationInput) => Promise<void>;
}) {
  const { t } = useT();
  const crmConnections = connections.filter((c) => c.platform === "bitrix24" || c.platform === "amocrm");

  const [name, setName] = useState(integration.name);
  // A stale integration may point at a deleted CRM; start empty so the user picks a live one.
  const [target, setTarget] = useState(
    crmConnections.some((c) => c._id === integration.targetConnectionId) ? integration.targetConnectionId : "",
  );
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageId, setStageId] = useState(integration.stageId ?? "");
  const [duplicateCheck, setDuplicateCheck] = useState(integration.duplicateCheck);
  const [formQuestions, setFormQuestions] = useState<FacebookQuestion[] | null>(null);
  const [crmFields, setCrmFields] = useState<CrmField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  // Choices made by hand in this dialog; the rest follows what is saved, then the suggestion.
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingStages(true);
    setStagesError(null);
    fetchCrmStages(target)
      .then(setStages)
      .catch((err) => setStagesError(err instanceof Error ? err.message : t("integrationsPage.stagesError")))
      .finally(() => setIsLoadingStages(false));
  }, [target, t]);

  const targetConnection = crmConnections.find((c) => c._id === target);
  const isBitrixTarget = targetConnection?.platform === "bitrix24";

  // The form's questions: from Facebook, or (if that fails) from the saved mapping.
  useEffect(() => {
    fetchFacebookForms(integration.facebookConnectionId)
      .then((forms) => setFormQuestions(forms.find((f) => f.id === integration.formId)?.questions ?? []))
      .catch(() => setFormQuestions([]));
  }, [integration.facebookConnectionId, integration.formId]);

  useEffect(() => {
    if (!target || !isBitrixTarget) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingFields(true);
    setFieldsError(null);
    fetchCrmFields(target)
      .then(setCrmFields)
      .catch((err) => setFieldsError(err instanceof Error ? err.message : t("integrationsPage.fieldsError")))
      .finally(() => setIsLoadingFields(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the selected target id changes
  }, [target, isBitrixTarget]);

  const questions = useMemo<FacebookQuestion[]>(() => {
    if (formQuestions && formQuestions.length > 0) return formQuestions;
    return integration.fieldMapping.map((e) => ({
      key: e.questionKey,
      label: e.questionLabel ?? e.questionKey,
      type: "CUSTOM",
    }));
  }, [formQuestions, integration.fieldMapping]);

  const mapping = useMemo(() => {
    // A saved mapping names fields of the CRM it was saved for.
    const saved =
      target === integration.targetConnectionId
        ? Object.fromEntries(integration.fieldMapping.map((e) => [e.questionKey, e.crmField]))
        : {};
    return { ...suggestMapping(questions, crmFields), ...saved, ...mappingOverrides };
  }, [questions, crmFields, target, integration.targetConnectionId, integration.fieldMapping, mappingOverrides]);

  function handleTargetChange(id: string) {
    setTarget(id);
    setStages([]);
    setStageId("");
    setStagesError(null);
    setCrmFields([]);
    setFieldsError(null);
    setMappingOverrides({});
  }

  async function handleSave() {
    if (!name.trim() || !target) {
      setError(t("integrationsPage.needNameCrm"));
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name,
        targetConnectionId: target,
        stageId: stageId || null,
        duplicateCheck,
        // Only sent when the CRM's fields loaded; a change of CRM clears the old mapping server-side.
        ...(isBitrixTarget && crmFields.length > 0 && questions.length > 0
          ? {
              fieldMapping: questions.map((q) => ({
                questionKey: q.key,
                questionLabel: q.label,
                crmField: mapping[q.key] ?? "",
              })),
            }
          : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrationsPage.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title={t("integrationsPage.editTitle")} onClose={onClose} widthClassName="max-w-xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">{t("integrationsPage.nameLabel")}</label>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={INPUT_CLASS} />
        </div>

        <div>
          <label className="block text-sm font-medium">{t("integrationsPage.stepSource")}</label>
          <p className="mt-1.5 text-sm text-muted">{integration.source}</p>
          <p className="mt-1 text-xs text-muted">{t("integrationsPage.sourceFixed")}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            {t("integrationsPage.targetLabel")} <span className="text-danger">*</span>
          </label>
          <Select value={target} onChange={(value) => handleTargetChange(value)}>
            <option value="" className="bg-surface">
              {t("integrationsPage.targetPlaceholder")}
            </option>
            {crmConnections.map((c) => (
              <option key={c._id} value={c._id} className="bg-surface">
                {platformName(c.platform)} — {c.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium">{t("integrationsPage.stageLabel")}</label>
          <Select
            value={stageId}
            onChange={(value) => setStageId(value)}
            disabled={!target || isLoadingStages}
            allowEmpty
          >
            <option value="" className="bg-surface">
              {!target
                ? t("integrationsPage.stageNeedTarget")
                : isLoadingStages
                  ? t("common.loading")
                  : t("integrationsPage.stageDefault")}
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
        </div>

        {isBitrixTarget && (
          <div>
            <label className="block text-sm font-medium">{t("integrationsPage.fieldsTitle")}</label>
            <p className="mt-1 mb-3 text-xs text-muted">{t("integrationsPage.fieldsHint")}</p>
            {isLoadingFields && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <RefreshCw className="size-3.5 animate-spin" />
                {t("integrationsPage.fieldsLoading")}
              </p>
            )}
            {fieldsError && <p className="text-sm text-danger">{fieldsError}</p>}
            {!isLoadingFields && !fieldsError && questions.length === 0 && formQuestions !== null && (
              <p className="text-sm text-muted">{t("integrationsPage.fieldsNoQuestions")}</p>
            )}
            {!isLoadingFields && !fieldsError && questions.length > 0 && (
              <>
                <FieldMappingEditor
                  questions={questions}
                  crmFields={crmFields}
                  value={mapping}
                  onChange={setMappingOverrides}
                />
                <p className="mt-3 text-xs text-muted">{t("integrationsPage.fieldsUnmappedNote")}</p>
              </>
            )}
          </div>
        )}

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

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? t("integrationsPage.saving") : t("integrationsPage.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
