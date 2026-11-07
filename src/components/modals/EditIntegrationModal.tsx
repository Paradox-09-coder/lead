"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { Select } from "@/components/ui/Select";
import { FieldMappingEditor, suggestMapping } from "@/components/modals/FieldMappingEditor";
import {
  HiddenFieldsEditor,
  rowsFromSaved,
  rowsToInput,
  type ExtraFieldRow,
} from "@/components/modals/HiddenFieldsEditor";
import {
  IntegrationSectionButtons,
  IntegrationSubView,
  type IntegrationView,
} from "@/components/modals/IntegrationSections";
import { useCrmTarget } from "@/components/modals/useCrmTarget";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import {
  createCrmField,
  type NewCrmFieldInput,
  fetchFacebookForms,
  type Connection,
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

  const [view, setView] = useState<IntegrationView>("main");
  const [name, setName] = useState(integration.name);
  // A stale integration may point at a deleted CRM; start empty so the user picks a live one.
  const [target, setTarget] = useState(
    crmConnections.some((c) => c._id === integration.targetConnectionId) ? integration.targetConnectionId : "",
  );
  const [stageId, setStageId] = useState(integration.stageId ?? "");
  const [sourceId, setSourceId] = useState(integration.sourceId ?? "");
  const [extras, setExtras] = useState<ExtraFieldRow[]>(() => rowsFromSaved(integration.hiddenFields ?? []));
  const [duplicateCheck, setDuplicateCheck] = useState(integration.duplicateCheck);
  const [formQuestions, setFormQuestions] = useState<FacebookQuestion[] | null>(null);
  // Choices made by hand in this dialog; the rest follows what is saved, then the suggestion.
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetConnection = crmConnections.find((c) => c._id === target);
  const isBitrixTarget = targetConnection?.platform === "bitrix24";
  const crm = useCrmTarget(target, isBitrixTarget);

  // The form's questions: from Facebook, or (if that fails) from the saved mapping.
  useEffect(() => {
    fetchFacebookForms(integration.facebookConnectionId)
      .then((forms) => setFormQuestions(forms.find((f) => f.id === integration.formId)?.questions ?? []))
      .catch(() => setFormQuestions([]));
  }, [integration.facebookConnectionId, integration.formId]);

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
    return { ...suggestMapping(questions, crm.crmFields), ...saved, ...mappingOverrides };
  }, [questions, crm.crmFields, target, integration.targetConnectionId, integration.fieldMapping, mappingOverrides]);

  // Creates a new field in the CRM and adds it to the list the questions pick from.
  async function handleCreateField(input: NewCrmFieldInput): Promise<CrmField> {
    const field = await createCrmField(target, input);
    crm.addCrmField(field);
    return field;
  }

  // The stage, source, hidden fields and mapping all belong to one CRM.
  function handleTargetChange(id: string) {
    setTarget(id);
    setStageId("");
    setSourceId("");
    setExtras([]);
    setMappingOverrides({});
  }

  const extraInputs = rowsToInput(extras);
  const savedHidden = (integration.hiddenFields ?? []).map(({ crmField, value }) => ({ crmField, value }));
  const hiddenChanged = JSON.stringify(extraInputs) !== JSON.stringify(savedHidden);
  const sourceChanged = sourceId !== (integration.sourceId ?? "");

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
        // Source and hidden fields are sent only when changed (or the CRM changed,
        // which clears them server-side), so an unreachable CRM cannot block an unrelated edit.
        ...(isBitrixTarget && sourceChanged ? { sourceId: sourceId || null } : {}),
        ...(hiddenChanged ? { hiddenFields: extraInputs } : {}),
        // Only sent when the CRM's fields loaded; a change of CRM clears the old mapping server-side.
        ...(crm.crmFields.length > 0 && questions.length > 0
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

  const title =
    view === "fields"
      ? t("integrationsPage.fieldsTitle")
      : view === "hidden"
        ? t("integrationsPage.hiddenTitle")
        : t("integrationsPage.editTitle");

  return (
    <Modal title={title} onClose={onClose} widthClassName="max-w-xl">
      {view === "main" && (
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

          <IntegrationSectionButtons
            disabled={!target}
            fieldsSummary={
              questions.length > 0 ? t("integrationsPage.formFieldsSummary", { count: questions.length }) : undefined
            }
            hiddenSummary={
              extraInputs.length > 0 ? t("integrationsPage.hiddenCount", { count: extraInputs.length }) : undefined
            }
            onOpen={setView}
          />

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
      )}

      {view === "fields" && (
        <IntegrationSubView onBack={() => setView("main")}>
          <p className="mb-3 text-xs text-muted">{t("integrationsPage.fieldsHint")}</p>
          {crm.isLoadingFields && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <RefreshCw className="size-3.5 animate-spin" />
              {t("integrationsPage.fieldsLoading")}
            </p>
          )}
          {crm.fieldsError && <p className="text-sm text-danger">{crm.fieldsError}</p>}
          {!crm.isLoadingFields && !crm.fieldsError && questions.length === 0 && formQuestions !== null && (
            <p className="text-sm text-muted">{t("integrationsPage.fieldsNoQuestions")}</p>
          )}
          {!crm.isLoadingFields && !crm.fieldsError && questions.length > 0 && (
            <>
              <FieldMappingEditor
                questions={questions}
                crmFields={crm.crmFields}
                value={mapping}
                onChange={setMappingOverrides}
                onCreateField={handleCreateField}
                listMultipleOnly={!isBitrixTarget}
              />
              <p className="mt-3 text-xs text-muted">{t("integrationsPage.fieldsUnmappedNote")}</p>
            </>
          )}
        </IntegrationSubView>
      )}

      {view === "hidden" && (
        <IntegrationSubView onBack={() => setView("main")}>
          <HiddenFieldsEditor
            targetId={target}
            isBitrixTarget={isBitrixTarget}
            crm={crm}
            stageId={stageId}
            onStageChange={setStageId}
            sourceId={sourceId}
            onSourceChange={setSourceId}
            extras={extras}
            onExtrasChange={setExtras}
            duplicateCheck={duplicateCheck}
            onDuplicateCheckChange={setDuplicateCheck}
          />
        </IntegrationSubView>
      )}
    </Modal>
  );
}
