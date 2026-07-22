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

async function callAuth(path: string, payload: Record<string, string>): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, "So'rov bajarilmadi"));
  }
}

export async function registerUser(fullName: string, email: string, password: string): Promise<void> {
  await callAuth("/api/auth/register", { fullName, email, password });
}

export async function loginUser(email: string, password: string): Promise<void> {
  await callAuth("/api/auth/login", { email, password });
}
