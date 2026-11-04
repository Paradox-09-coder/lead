"use client";

import { Select } from "@/components/ui/Select";
import type { CrmField, FacebookQuestion } from "@/lib/connections-client";
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

export function FieldMappingEditor({
  questions,
  crmFields,
  value,
  onChange,
}: {
  questions: FacebookQuestion[];
  crmFields: CrmField[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const { t } = useT();

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-2 gap-3 text-xs font-medium text-muted">
        <span>{t("integrationsPage.fieldsQuestion")}</span>
        <span>{t("integrationsPage.fieldsCrm")}</span>
      </div>
      {questions.map((question) => (
        <div key={question.key} className="grid sm:grid-cols-2 gap-x-3 sm:items-center">
          <div className="min-w-0 pt-1.5 sm:pt-0">
            <p className="text-sm break-words">{question.label}</p>
          </div>
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
        </div>
      ))}
    </div>
  );
}
