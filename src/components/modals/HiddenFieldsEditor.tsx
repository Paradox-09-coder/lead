"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { CrmField } from "@/lib/connections-client";
import type { HiddenFieldInput } from "@/lib/integrations-client";
import type { CrmTargetData } from "@/components/modals/useCrmTarget";
import { useT } from "@/i18n/client";

// One "extra field" row being edited. `id` only keys the row in the list.
export interface ExtraFieldRow {
  id: number;
  crmField: string;
  value: string;
}

let lastRowId = 0;

export function newExtraRow(crmField = "", value = ""): ExtraFieldRow {
  lastRowId += 1;
  return { id: lastRowId, crmField, value };
}

export function rowsFromSaved(saved: HiddenFieldInput[]): ExtraFieldRow[] {
  return saved.map((entry) => newExtraRow(entry.crmField, entry.value));
}

// Rows the user filled in, in the shape the API takes. Half-filled rows are dropped.
export function rowsToInput(rows: ExtraFieldRow[]): HiddenFieldInput[] {
  return rows
    .filter((row) => row.crmField && row.value.trim() !== "")
    .map((row) => ({ crmField: row.crmField, value: row.value.trim() }));
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50";

// A field that takes several values can be picked in more than one row.
function isRepeatable(field: CrmField): boolean {
  return field.multiple || field.type === "crm_multifield";
}

function ValueInput({
  field,
  value,
  onChange,
}: {
  field: CrmField | undefined;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useT();

  if (!field) {
    return <input disabled placeholder={t("integrationsPage.extraValuePlaceholder")} className={INPUT_CLASS} />;
  }
  if (field.type === "enumeration") {
    return (
      <Select value={value} onChange={onChange} searchable searchPlaceholder={t("integrationsPage.fieldsSearch")} noResultsLabel={t("integrationsPage.fieldsNoResults")}>
        <option value="">{t("integrationsPage.extraPickValue")}</option>
        {(field.items ?? []).map((item) => (
          <option key={item.id} value={item.id}>
            {item.value}
          </option>
        ))}
      </Select>
    );
  }
  if (field.type === "boolean") {
    return (
      <Select value={value} onChange={onChange}>
        <option value="">{t("integrationsPage.extraPickValue")}</option>
        <option value="Y">{t("integrationsPage.valueYes")}</option>
        <option value="N">{t("integrationsPage.valueNo")}</option>
      </Select>
    );
  }

  const inputType =
    field.type === "integer" || field.type === "double"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "datetime"
          ? "datetime-local"
          : "text";
  return (
    <input
      type={inputType}
      step={field.type === "double" ? "any" : field.type === "integer" ? 1 : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={500}
      placeholder={t("integrationsPage.extraValuePlaceholder")}
      className={INPUT_CLASS}
    />
  );
}

// The "Yashirin maydonlar" view: what every lead of the integration gets no
// matter what the Facebook form asked — the stage it lands in, its CRM source,
// and extra CRM fields with a fixed value. UTM tags are always filled in
// automatically, so there is nothing to choose for them.
export function HiddenFieldsEditor({
  targetId,
  isBitrixTarget,
  crm,
  stageId,
  onStageChange,
  sourceId,
  onSourceChange,
  extras,
  onExtrasChange,
  duplicateCheck,
  onDuplicateCheckChange,
}: {
  targetId: string;
  isBitrixTarget: boolean;
  crm: CrmTargetData;
  stageId: string;
  onStageChange: (id: string) => void;
  sourceId: string;
  onSourceChange: (id: string) => void;
  extras: ExtraFieldRow[];
  onExtrasChange: (rows: ExtraFieldRow[]) => void;
  duplicateCheck: boolean;
  onDuplicateCheckChange: (value: boolean) => void;
}) {
  const { t } = useT();
  const fieldById = new Map(crm.crmFields.map((field) => [field.id, field]));

  function updateRow(id: number, patch: Partial<ExtraFieldRow>) {
    onExtrasChange(extras.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  // A single-value field already used by another row is not offered again.
  function optionsFor(rowId: number): CrmField[] {
    const taken = new Set(
      extras.filter((row) => row.id !== rowId && row.crmField).map((row) => row.crmField),
    );
    return crm.crmFields.filter((field) => isRepeatable(field) || !taken.has(field.id));
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t("integrationsPage.hiddenHint")}</p>

      {!targetId && <p className="text-sm text-warning">{t("integrationsPage.hiddenSelectTarget")}</p>}

      <div>
        <label className="block text-sm font-medium">{t("integrationsPage.stageWhereLabel")}</label>
        <Select
          value={stageId}
          onChange={onStageChange}
          disabled={!targetId || crm.isLoadingStages}
          allowEmpty
        >
          <option value="" className="bg-surface">
            {!targetId
              ? t("integrationsPage.stageNeedTarget")
              : crm.isLoadingStages
                ? t("common.loading")
                : t("integrationsPage.stageDefault")}
          </option>
          {crm.stages.map((stage) => (
            <option key={stage.id} value={stage.id} className="bg-surface">
              {stage.name}
            </option>
          ))}
        </Select>
        {crm.isLoadingStages && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <RefreshCw className="size-3 animate-spin" />
            {t("integrationsPage.stagesLoading")}
          </p>
        )}
        {crm.stagesError && <p className="mt-1.5 text-xs text-danger">{crm.stagesError}</p>}
        {!crm.isLoadingStages && !crm.stagesError && targetId && crm.stages.length === 0 && (
          <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.stagesEmpty")}</p>
        )}
      </div>

      {isBitrixTarget && (
        <div>
          <label className="block text-sm font-medium">{t("integrationsPage.sourceFieldLabel")}</label>
          <Select
            value={sourceId}
            onChange={onSourceChange}
            disabled={crm.isLoadingSources}
            allowEmpty
            searchable
            searchPlaceholder={t("integrationsPage.fieldsSearch")}
            noResultsLabel={t("integrationsPage.fieldsNoResults")}
              >
            <option value="" className="bg-surface">
              {crm.isLoadingSources ? t("common.loading") : t("integrationsPage.sourceFieldDefault")}
            </option>
            {crm.sources.map((source) => (
              <option key={source.id} value={source.id} className="bg-surface">
                {source.name}
              </option>
            ))}
          </Select>
          {crm.isLoadingSources && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <RefreshCw className="size-3 animate-spin" />
              {t("integrationsPage.sourcesLoading")}
            </p>
          )}
          {crm.sourcesError ? (
            <p className="mt-1.5 text-xs text-danger">{crm.sourcesError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">{t("integrationsPage.sourceFieldHint")}</p>
          )}
        </div>
      )}

      {targetId && (
        <div>
          <label className="block text-sm font-medium">{t("integrationsPage.extraTitle")}</label>
          <p className="mt-1 mb-3 text-xs text-muted">{t("integrationsPage.extraHint")}</p>

          {crm.isLoadingFields && (
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <RefreshCw className="size-3.5 animate-spin" />
              {t("integrationsPage.fieldsLoading")}
            </p>
          )}
          {crm.fieldsError && <p className="text-sm text-danger">{crm.fieldsError}</p>}

          {!crm.isLoadingFields && !crm.fieldsError && (
            <div className="space-y-3">
              {extras.length > 0 && (
                <div className="hidden sm:grid grid-cols-[1fr_1fr_2rem] gap-3 text-xs font-medium text-muted">
                  <span>{t("integrationsPage.extraFieldLabel")}</span>
                  <span>{t("integrationsPage.extraValueLabel")}</span>
                  <span />
                </div>
              )}
              {extras.map((row) => (
                <div key={row.id} className="grid sm:grid-cols-[1fr_1fr_2rem] gap-3 items-start">
                  <Select
                    value={row.crmField}
                    onChange={(next) => updateRow(row.id, { crmField: next, value: "" })}
                    searchable
                    searchPlaceholder={t("integrationsPage.fieldsSearch")}
                    noResultsLabel={t("integrationsPage.fieldsNoResults")}
                  >
                    <option value="">{t("integrationsPage.extraFieldPlaceholder")}</option>
                    {optionsFor(row.id).map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                        {field.custom ? ` · ${t("integrationsPage.fieldsCustom")}` : ""}
                      </option>
                    ))}
                  </Select>
                  <ValueInput
                    // A new field means a new kind of input, so start it fresh.
                    key={row.crmField}
                    field={fieldById.get(row.crmField)}
                    value={row.value}
                    onChange={(next) => updateRow(row.id, { value: next })}
                  />
                  <button
                    type="button"
                    onClick={() => onExtrasChange(extras.filter((item) => item.id !== row.id))}
                    className="mt-1.5 p-2 rounded-md text-muted hover:bg-surface-hover hover:text-danger transition-colors"
                    aria-label={t("integrationsPage.extraRemove")}
                    title={t("integrationsPage.extraRemove")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onExtrasChange([...extras, newExtraRow()])}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="size-3.5" />
                {t("integrationsPage.extraAdd")}
              </button>
            </div>
          )}
        </div>
      )}

      <label className="flex items-center justify-between rounded-md border border-border px-4 py-3">
        <span className="text-sm">{t("integrationsPage.duplicateCheck")}</span>
        <button
          type="button"
          onClick={() => onDuplicateCheckChange(!duplicateCheck)}
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
  );
}
