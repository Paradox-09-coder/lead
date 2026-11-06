export interface Connection {
  _id: string;
  platform: "bitrix24" | "amocrm" | "facebook" | "google";
  label: string;
  accountUrl?: string;
  pageId?: string;
  createdAt: string;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchConnections(): Promise<Connection[]> {
  const response = await fetch("/api/connections");
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Ulanishlarni yuklab bo'lmadi"));
  }
  return (await response.json()) as Connection[];
}

export async function createBitrix24Connection(webhookUrl: string): Promise<Connection> {
  const response = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "bitrix24", webhookUrl }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Bitrix24'ga ulanmadi"));
  }
  return (await response.json()) as Connection;
}

export async function createAmoCrmConnection(accountUrl: string, jwtToken: string): Promise<Connection> {
  const response = await fetch("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "amocrm", accountUrl, jwtToken }),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "amoCRM/Kommo'ga ulanmadi"));
  }
  return (await response.json()) as Connection;
}

export async function deleteConnection(id: string): Promise<void> {
  const response = await fetch(`/api/connections/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "O'chirilmadi"));
  }
}

export interface FacebookQuestion {
  key: string; // the name the answer arrives under in a lead
  label: string;
  type: string; // FULL_NAME, PHONE, EMAIL, CUSTOM …
}

export interface FacebookLeadForm {
  id: string;
  name: string;
  status: string;
  questions: FacebookQuestion[];
}

export async function fetchFacebookForms(connectionId: string): Promise<FacebookLeadForm[]> {
  const response = await fetch(`/api/connections/${connectionId}/facebook-forms`);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Formalar ro'yxati olinmadi"));
  }
  return (await response.json()) as FacebookLeadForm[];
}

export interface CrmStage {
  id: string;
  name: string;
}

export async function fetchCrmStages(connectionId: string): Promise<CrmStage[]> {
  const response = await fetch(`/api/connections/${connectionId}/stages`);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Bosqichlar ro'yxati olinmadi"));
  }
  return (await response.json()) as CrmStage[];
}

// A CRM lead field a form answer can be written to (Bitrix24: standard and custom).
export interface CrmField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  multiple: boolean;
  custom: boolean;
  items?: { id: string; value: string }[]; // list options
}

export async function fetchCrmFields(connectionId: string): Promise<CrmField[]> {
  const response = await fetch(`/api/connections/${connectionId}/fields`);
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Maydonlar ro'yxati olinmadi"));
  }
  return (await response.json()) as CrmField[];
}

export type NewCrmFieldType = "string" | "integer" | "double" | "boolean" | "date" | "datetime" | "url" | "enumeration";

export interface NewCrmFieldInput {
  label: string;
  type: NewCrmFieldType;
  multiple: boolean;
  options: string[];
}

// Creates a new custom lead field in the CRM and returns it.
export async function createCrmField(connectionId: string, input: NewCrmFieldInput): Promise<CrmField> {
  const response = await fetch(`/api/connections/${connectionId}/fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Maydon yaratilmadi"));
  }
  return (await response.json()) as CrmField;
}
