// One Facebook form question and the CRM field its answer goes to ("" = into the comment).
export interface FieldMappingInput {
  questionKey: string;
  questionLabel?: string | null;
  crmField: string;
}

// A CRM field that gets the same fixed value on every lead ("hidden field").
export interface HiddenFieldInput {
  crmField: string;
  value: string;
}

export interface Integration {
  _id: string;
  name: string;
  source: string;
  target: string;
  targetConnectionId: string;
  facebookConnectionId: string;
  formId: string;
  stageId: string | null;
  // Bitrix24 lead source (SOURCE_ID); null = the default, Facebook.
  sourceId: string | null;
  fieldMapping: FieldMappingInput[];
  hiddenFields: HiddenFieldInput[];
  duplicateCheck: boolean;
  status: "active" | "paused";
  createdAt: string;
}

export interface UpdateIntegrationInput {
  name?: string;
  status?: "active" | "paused";
  targetConnectionId?: string;
  stageId?: string | null;
  sourceId?: string | null;
  duplicateCheck?: boolean;
  fieldMapping?: FieldMappingInput[] | null;
  hiddenFields?: HiddenFieldInput[] | null;
}

export interface CreateIntegrationInput {
  name: string;
  facebookConnectionId: string;
  formId: string;
  formName: string;
  targetConnectionId: string;
  stageId?: string;
  sourceId?: string;
  fieldMapping?: FieldMappingInput[];
  hiddenFields?: HiddenFieldInput[];
  duplicateCheck: boolean;
}

interface ApiErrorBody {
  message?: string;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchIntegrations(): Promise<Integration[]> {
  const response = await fetch("/api/integrations");
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Integratsiyalarni yuklab bo'lmadi"));
  }
  return (await response.json()) as Integration[];
}

export async function createIntegration(input: CreateIntegrationInput): Promise<Integration> {
  const response = await fetch("/api/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Integratsiya saqlanmadi"));
  }
  return (await response.json()) as Integration;
}

export async function updateIntegration(id: string, input: UpdateIntegrationInput): Promise<void> {
  const response = await fetch(`/api/integrations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "Saqlanmadi"));
  }
}

export async function deleteIntegration(id: string): Promise<void> {
  const response = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "O'chirilmadi"));
  }
}
