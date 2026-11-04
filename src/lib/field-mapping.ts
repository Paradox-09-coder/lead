import type { FieldMappingEntry } from "@/models/Integration";
import { fetchBitrixLeadFields } from "@/lib/bitrix-fields";

export interface FacebookAnswer {
  name: string;
  values?: string[];
}

export interface MappingInput {
  questionKey?: unknown;
  questionLabel?: unknown;
  crmField?: unknown;
}

const MAX_ENTRIES = 100;

export class FieldMappingError extends Error {}

// Validates a mapping sent by the dashboard against the CRM's real field list
// and fills in each field's type/options. Throws FieldMappingError when a
// chosen field does not exist (e.g. it was deleted in Bitrix24 meanwhile).
export async function normalizeFieldMapping(webhookUrl: string, input: unknown): Promise<FieldMappingEntry[]> {
  if (!Array.isArray(input)) throw new FieldMappingError("Maydonlar moslamasi noto'g'ri");
  const defs = new Map((await fetchBitrixLeadFields(webhookUrl)).map((def) => [def.id, def]));

  const seen = new Set<string>();
  const entries: FieldMappingEntry[] = [];
  for (const raw of (input as MappingInput[]).slice(0, MAX_ENTRIES)) {
    const questionKey = typeof raw.questionKey === "string" ? raw.questionKey.trim() : "";
    if (!questionKey || seen.has(questionKey)) continue;
    seen.add(questionKey);

    const questionLabel = typeof raw.questionLabel === "string" ? raw.questionLabel.slice(0, 200) : undefined;
    const crmField = typeof raw.crmField === "string" ? raw.crmField : "";
    if (!crmField) {
      entries.push({ questionKey, questionLabel, crmField: "" });
      continue;
    }
    const def = defs.get(crmField);
    if (!def) throw new FieldMappingError(`Bitrix24'da "${crmField}" maydoni topilmadi`);
    entries.push({
      questionKey,
      questionLabel,
      crmField,
      crmFieldType: def.type,
      crmFieldMultiple: def.multiple || undefined,
      crmItems: def.type === "enumeration" ? def.items : undefined,
    });
  }
  return entries;
}

const TRUE_WORDS = new Set(["true", "yes", "y", "1", "ha", "да", "on"]);

function multifieldType(field: string): string {
  return field === "IM" ? "OTHER" : "WORK";
}

export interface MappedLeadFields {
  // crm.lead.add fields to merge into the request
  fields: Record<string, unknown>;
  // answers that have no CRM field (or did not fit it), kept for the comment
  comments: string[];
}

// Turns a lead's Facebook answers into crm.lead.add fields following the
// integration's mapping. Nothing is dropped: an answer with no field, an
// unknown question, or a value the field cannot take (a number field given
// text, a list option that does not exist) is added to the comment instead.
export function buildMappedFields(mapping: FieldMappingEntry[], answers: FacebookAnswer[]): MappedLeadFields {
  const fields: Record<string, unknown> = {};
  const comments: string[] = [];
  const handled = new Set<string>();
  const answerByKey = new Map(
    answers.map((answer) => [answer.name.toLowerCase(), (answer.values ?? []).filter(Boolean).join(", ")]),
  );

  const addComment = (label: string, value: string) => comments.push(`${label}: ${value}`);

  for (const entry of mapping) {
    const key = entry.questionKey.toLowerCase();
    handled.add(key);
    const value = answerByKey.get(key);
    if (!value) continue;
    const label = entry.questionLabel || entry.questionKey;

    if (!entry.crmField) {
      addComment(label, value);
      continue;
    }

    const field = entry.crmField;
    const type = entry.crmFieldType ?? "string";

    if (type === "crm_multifield") {
      const list = (fields[field] as Array<{ VALUE: string; VALUE_TYPE: string }> | undefined) ?? [];
      list.push({ VALUE: value, VALUE_TYPE: multifieldType(field) });
      fields[field] = list;
      continue;
    }

    let converted: unknown;
    if (type === "enumeration") {
      const lowered = value.toLowerCase();
      const item = entry.crmItems?.find((i) => i.value.toLowerCase() === lowered || i.id === value);
      if (!item) {
        addComment(label, value);
        continue;
      }
      converted = item.id;
    } else if (type === "boolean") {
      converted = TRUE_WORDS.has(value.toLowerCase()) ? "Y" : "N";
    } else if (type === "integer" || type === "double") {
      const number = Number(value.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(number)) {
        addComment(label, value);
        continue;
      }
      converted = type === "integer" ? Math.trunc(number) : number;
    } else {
      // Text: several questions on one field (first + last name) are joined.
      const existing = fields[field];
      converted = typeof existing === "string" ? `${existing} ${value}` : value;
    }

    fields[field] = entry.crmFieldMultiple && !Array.isArray(converted) ? [converted] : converted;
  }

  for (const answer of answers) {
    if (handled.has(answer.name.toLowerCase())) continue;
    const value = (answer.values ?? []).filter(Boolean).join(", ");
    if (value) addComment(answer.name, value);
  }

  return { fields, comments };
}
