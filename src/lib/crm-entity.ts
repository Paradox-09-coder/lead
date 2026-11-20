// What an integration creates in a Bitrix24 portal for every Facebook lead: a lead card, or a deal ("sdelka").
// amoCRM/Kommo has only one kind of card (its "lead" is the deal), so it always uses "lead".
// No server-only imports: the dashboard and the API both use this.

export type CrmEntity = "lead" | "deal";

export const CRM_ENTITIES: readonly CrmEntity[] = ["lead", "deal"];

// A deal has no phone/email/name of its own: they belong to its contact. In a deal integration the contact's
// fields are offered next to the deal's own, with this prefix on their ids ("CONTACT.PHONE").
export const CONTACT_FIELD_PREFIX = "CONTACT.";

export function parseCrmEntity(value: unknown): CrmEntity {
  return value === "deal" ? "deal" : "lead";
}

export function isContactField(fieldId: string): boolean {
  return fieldId.startsWith(CONTACT_FIELD_PREFIX);
}

export function contactFieldName(fieldId: string): string {
  return isContactField(fieldId) ? fieldId.slice(CONTACT_FIELD_PREFIX.length) : fieldId;
}

// Bitrix24 deal stages of a non-default pipeline look like "C3:NEW"; the default pipeline's are plain ("NEW").
export function dealCategoryOfStage(stageId: string | undefined): number {
  const match = /^C(\d+):/.exec(stageId ?? "");
  return match ? Number(match[1]) : 0;
}
