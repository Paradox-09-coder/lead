"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { CrmField, FacebookQuestion, NewCrmFieldInput, NewCrmFieldType } from "@/lib/connections-client";
import { useT } from "@/i18n/client";

// Facebook's built-in question keys and the Bitrix24 field they usually belong in.
const KEY_TO_FIELD: Record<string, string> = {
  full_name: "NAME",
  first_name: "NAME",
  last_name: "LAST_NAME",
  email: "EMAIL",
  work_email: "EMAIL",
  phone_number: "PHONE",
  work_phone_number: "PHONE",
  company_name: "COMPANY_TITLE",
  job_title: "POST",
  city: "ADDRESS_CITY",
  state: "ADDRESS_PROVINCE",
  province: "ADDRESS_PROVINCE",
  zip_code: "ADDRESS_POSTAL_CODE",
  post_code: "ADDRESS_POSTAL_CODE",
  country: "ADDRESS_COUNTRY",
  street_address: "ADDRESS",
  date_of_birth: "BIRTHDATE",
};

// A first guess for every question: Facebook's standard questions go to the
// matching standard field, and a custom question whose text is the same as a
// Bitrix24 field's name goes to that field. Anything else stays unmapped (its
// answer then goes into the lead's comment). The user can change all of it.
export function suggestMapping(questions: FacebookQuestion[], crmFields: CrmField[]): Record<string, string> {
  const byId = new Map(crmFields.map((field) => [field.id, field]));
  const byLabel = new Map(crmFields.map((field) => [field.label.trim().toLowerCase(), field]));
  const used = new Set<string>();
  const result: Record<string, string> = {};

  for (const question of questions) {
    const standard = KEY_TO_FIELD[question.key.toLowerCase()];
    const candidate =
      (standard ? byId.get(standard) : undefined) ?? byLabel.get(question.label.trim().toLowerCase());
    // Two questions on one single-value field (full_name and first_name) would garble it.
    if (candidate && (candidate.type === "crm_multifield" || !used.has(candidate.id))) {
      result[question.key] = candidate.id;
      used.add(candidate.id);
    } else {
      result[question.key] = "";
    }
  }
  return result;
}

const FIELD_TYPE_OPTIONS: Array<{ value: NewCrmFieldType; labelKey: string }> = [
  { value: "string", labelKey: "integrationsPage.typeString" },
  { value: "integer", labelKey: "integrationsPage.typeInteger" },
  { value: "double", labelKey: "integrationsPage.typeDouble" },
  { value: "boolean", labelKey: "integrationsPage.typeBoolean" },
  { value: "date", labelKey: "integrationsPage.typeDate" },
  { value: "datetime", labelKey: "integrationsPage.typeDatetime" },
  { value: "url", labelKey: "integrationsPage.typeUrl" },
  { value: "enumeration", labelKey: "integrationsPage.typeEnumeration" },
];

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary";

// Inline form for creating a new CRM field for one question.
function NewFieldForm({
  initialLabel,
  listMultipleOnly,
  onCreate,
  onCancel,
}: {
  initialLabel: string;
  listMultipleOnly?: boolean;
  onCreate: (input: NewCrmFieldInput) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [label, setLabel] = useState(initialLabel);
  const [type, setType] = useState<NewCrmFieldType>("string");
  const [multiple, setMultiple] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const canBeMultiple = type !== "boolean" && (!listMultipleOnly || type === "enumeration");
  const canSave = label.trim() !== "" && (type !== "enumeration" || options.length > 0);

  async function handleCreate() {
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({ label: label.trim(), type, multiple: canBeMultiple && multiple, options });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("integrationsPage.fieldsNewError"));
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-primary/40 bg-surface-hover/40 p-4">
      <p className="text-sm font-medium">{t("integrationsPage.fieldsNewTitle")}</p>

      <div>
        <label className="block text-xs font-medium text-muted">{t("integrationsPage.fieldsNewName")}</label>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          maxLength={100}
          className={INPUT_CLASS}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted">{t("integrationsPage.fieldsNewType")}</label>
        <Select value={type} onChange={(value) => setType(value as NewCrmFieldType)}>
          {FIELD_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      {type === "enumeration" && (
        <div>
          <label className="block text-xs font-medium text-muted">{t("integrationsPage.fieldsNewOptions")}</label>
          <textarea
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            rows={4}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-muted">{t("integrationsPage.fieldsNewOptionsHint")}</p>
        </div>
      )}

      {canBeMultiple && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiple}
            onChange={(event) => setMultiple(event.target.checked)}
            className="size-4 accent-primary"
          />
          {t("integrationsPage.fieldsNewMultiple")}
        </label>
      )}

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm">
          <p className="break-words text-danger">{error}</p>
          <p className="mt-1 text-xs text-muted">{t("integrationsPage.fieldsNewRights")}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
        >
          {t("integrationsPage.fieldsNewCancel")}
        </button>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canSave || isSaving}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isSaving ? t("integrationsPage.fieldsNewCreating") : t("integrationsPage.fieldsNewCreate")}
        </button>
      </div>
    </div>
  );
}

export function FieldMappingEditor({
  questions,
  crmFields,
  value,
  onChange,
  onCreateField,
  listMultipleOnly,
}: {
  questions: FacebookQuestion[];
  crmFields: CrmField[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  // Creates a new field in the CRM; when given, each question offers "new field".
  onCreateField?: (input: NewCrmFieldInput) => Promise<CrmField>;
  // amoCRM: only a list field can hold several values.
  listMultipleOnly?: boolean;
}) {
  const { t } = useT();
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="hidden sm:grid grid-cols-2 gap-3 text-xs font-medium text-muted">
        <span>{t("integrationsPage.fieldsQuestion")}</span>
        <span>{t("integrationsPage.fieldsCrm")}</span>
      </div>
      {questions.map((question) => (
        <div key={question.key}>
          <div className="grid sm:grid-cols-2 gap-x-3 sm:items-start">
            <div className="min-w-0 pt-1.5 sm:pt-2.5">
              <p className="text-sm break-words">{question.label}</p>
            </div>
            <div>
              <Select
                value={value[question.key] ?? ""}
                onChange={(next) => onChange({ ...value, [question.key]: next })}
                allowEmpty
                searchable
                searchPlaceholder={t("integrationsPage.fieldsSearch")}
                noResultsLabel={t("integrationsPage.fieldsNoResults")}
              >
                <option value="">{t("integrationsPage.fieldsToComment")}</option>
                {crmFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                    {field.custom ? ` · ${t("integrationsPage.fieldsCustom")}` : ""}
                  </option>
                ))}
              </Select>
              {onCreateField && creatingFor !== question.key && (
                <button
                  type="button"
                  onClick={() => setCreatingFor(question.key)}
                  className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="size-3" />
                  {t("integrationsPage.fieldsNew")}
                </button>
              )}
            </div>
          </div>
          {onCreateField && creatingFor === question.key && (
            <NewFieldForm
              initialLabel={question.label}
              listMultipleOnly={listMultipleOnly}
              onCancel={() => setCreatingFor(null)}
              onCreate={async (input) => {
                const field = await onCreateField(input);
                onChange({ ...value, [question.key]: field.id });
                setCreatingFor(null);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
