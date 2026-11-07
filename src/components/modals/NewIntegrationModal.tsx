"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { Select } from "@/components/ui/Select";
import { FieldMappingEditor, suggestMapping } from "@/components/modals/FieldMappingEditor";
import { HiddenFieldsEditor, rowsToInput, type ExtraFieldRow } from "@/components/modals/HiddenFieldsEditor";
import {
  IntegrationSectionButtons,
  IntegrationSubView,
  type IntegrationView,
} from "@/components/modals/IntegrationSections";
import { useCrmTarget } from "@/components/modals/useCrmTarget";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import {
  fetchFacebookForms,
  createCrmField,
  type NewCrmFieldInput,
  type Connection,
  type FacebookLeadForm,
  type CrmField,
} from "@/lib/connections-client";
import type { CreateIntegrationInput } from "@/lib/integrations-client";
import { useT } from "@/i18n/client";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

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
  const [view, setView] = useState<IntegrationView>("main");

  const [name, setName] = useState("");
  const [facebookConnectionId, setFacebookConnectionId] = useState("");
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [formId, setFormId] = useState("");
  const [target, setTarget] = useState("");
  const [stageId, setStageId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [extras, setExtras] = useState<ExtraFieldRow[]>([]);
  // Choices the user made by hand; everything else follows the automatic suggestion.
  const [mappingOverrides, setMappingOverrides] = useState<Record<string, string>>({});
  const [duplicateCheck, setDuplicateCheck] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const facebookConnections = connections.filter((c) => c.platform === "facebook");
  const selectedConnection = facebookConnections.find((c) => c._id === facebookConnectionId);
  const crmConnections = connections.filter((c) => c.platform === "bitrix24" || c.platform === "amocrm");
  const targetConnection = crmConnections.find((c) => c._id === target);
  const isBitrixTarget = targetConnection?.platform === "bitrix24";
  const crm = useCrmTarget(target, isBitrixTarget);

  const questions = useMemo(() => forms.find((f) => f.id === formId)?.questions ?? [], [forms, formId]);
  const mapping = useMemo(
    () => ({ ...suggestMapping(questions, crm.crmFields), ...mappingOverrides }),
    [questions, crm.crmFields, mappingOverrides],
  );

  useEffect(() => {
    if (!facebookConnectionId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingForms(true);
    setFormsError(null);
    fetchFacebookForms(facebookConnectionId)
      .then((loaded) => {
        if (!cancelled) setForms(loaded);
      })
      .catch((err) => {
        if (!cancelled) setFormsError(err instanceof Error ? err.message : t("integrationsPage.formsError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingForms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facebookConnectionId, t]);

  function handleFacebookConnectionChange(id: string) {
    setFacebookConnectionId(id);
    setForms([]);
    setFormId("");
    setFormsError(null);
    setMappingOverrides({});
  }

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

  function handleFormChange(id: string) {
    setFormId(id);
    setMappingOverrides({});
  }

  const extraInputs = rowsToInput(extras);
  const canSave = name.trim() !== "" && facebookConnectionId !== "" && formId !== "" && target !== "";

  async function handleSave() {
    if (!name.trim()) {
      setSaveError(t("integrationsPage.needNameCrm"));
      return;
    }
    if (!selectedConnection || !formId) {
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
        name: name.trim(),
        facebookConnectionId: selectedConnection._id,
        formId,
        formName: selectedForm?.name ?? formId,
        targetConnectionId: targetConnection._id,
        stageId: stageId || undefined,
        sourceId: isBitrixTarget && sourceId ? sourceId : undefined,
        hiddenFields: extraInputs.length > 0 ? extraInputs : undefined,
        // Only sent when the CRM's fields loaded; otherwise name/phone/email go as before.
        fieldMapping:
          crm.crmFields.length > 0 && questions.length > 0
            ? questions.map((q) => ({ questionKey: q.key, questionLabel: q.label, crmField: mapping[q.key] ?? "" }))
            : undefined,
        duplicateCheck,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("integrationsPage.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  const title =
    view === "fields"
      ? t("integrationsPage.fieldsTitle")
      : view === "hidden"
        ? t("integrationsPage.hiddenTitle")
        : t("integrationsPage.modalTitle");

  return (
    <Modal title={title} onClose={onClose} widthClassName="max-w-xl">
      {view === "main" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.nameLabel")} <span className="text-danger">*</span>
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              placeholder={t("integrationsPage.formNamePlaceholder")}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              {t("integrationsPage.stepSource")} <span className="text-danger">*</span>
            </label>
            {facebookConnections.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Select value={facebookConnectionId} onChange={(value) => handleFacebookConnectionChange(value)}>
                    <option value="" className="bg-surface">
                      {t("integrationsPage.fbPagePlaceholder")}
                    </option>
                    {facebookConnections.map((c) => (
                      <option key={c._id} value={c._id} className="bg-surface">
                        Facebook — {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Select
                    value={formId}
                    onChange={(value) => handleFormChange(value)}
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
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-warning">
                {t("integrationsPage.connectFbFirst")}{" "}
                <Link href="/dashboard/connections" className="underline">
                  {t("integrationsPage.connectFbLink")}
                </Link>
                .
              </p>
            )}
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

          {saveError && <p className="text-sm text-danger">{saveError}</p>}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !canSave}
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

          {!formId && <p className="text-sm text-warning">{t("integrationsPage.formPlaceholder")}</p>}

          {formId && crm.isLoadingFields && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <RefreshCw className="size-3.5 animate-spin" />
              {t("integrationsPage.fieldsLoading")}
            </p>
          )}

          {formId && crm.fieldsError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm">
              <p className="text-danger">{crm.fieldsError}</p>
              <p className="mt-1 text-xs text-muted">{t("integrationsPage.fieldsFallback")}</p>
            </div>
          )}

          {formId && !crm.isLoadingFields && !crm.fieldsError && questions.length === 0 && (
            <p className="text-sm text-muted">{t("integrationsPage.fieldsNoQuestions")}</p>
          )}

          {formId && !crm.isLoadingFields && !crm.fieldsError && questions.length > 0 && (
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
