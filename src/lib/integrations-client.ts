export interface Integration {
  _id: string;
  name: string;
  source: string;
  target: string;
  status: "active" | "paused";
  createdAt: string;
}

export interface CreateIntegrationInput {
  name: string;
  facebookConnectionId: string;
  formId: string;
  formName: string;
  targetConnectionId: string;
  stageId?: string;
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

export async function deleteIntegration(id: string): Promise<void> {
  const response = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "O'chirilmadi"));
  }
}
