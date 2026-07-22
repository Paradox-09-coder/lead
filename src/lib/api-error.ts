export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface MongooseErrorLike {
  name?: string;
  code?: number;
  errors?: Record<string, { message: string }>;
  keyValue?: Record<string, unknown>;
  message?: string;
}

// Maps thrown errors (ApiError, Mongoose validation/duplicate-key/cast errors,
// or plain Error) to a user-facing message + HTTP status, mirroring the old
// Express errorHandler middleware's behavior.
export function toErrorResponseBody(err: unknown): { message: string; status: number } {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status };
  }

  if (err && typeof err === "object") {
    const e = err as MongooseErrorLike;

    if (e.name === "ValidationError" && e.errors) {
      return {
        message: Object.values(e.errors)
          .map((x) => x.message)
          .join(", "),
        status: 400,
      };
    }

    if (e.code === 11000) {
      const field = Object.keys(e.keyValue ?? {})[0] ?? "maydon";
      return { message: `Bu ${field} allaqachon band`, status: 409 };
    }

    if (e.name === "CastError") {
      return { message: "Noto'g'ri ID format", status: 400 };
    }
  }

  return { message: err instanceof Error ? err.message : "Server xatosi", status: 500 };
}
