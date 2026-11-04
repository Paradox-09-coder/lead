"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Copy, Eye, EyeOff, KeyRound, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";

interface ApiKeyItem {
  _id: string;
  name: string;
  prefix: string;
  key: string;
  lastUsedAt: string | null;
  createdAt: string;
}

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

// Date, no seconds — e.g. "2026-10-16 14:32".
function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
  return new Date(value).toLocaleString(localeTag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KeyRow({
  apiKey,
  locale,
  copyLabel,
  copiedLabel,
  showLabel,
  hideLabel,
  deleteLabel,
  onDelete,
}: {
  apiKey: ApiKeyItem;
  locale: string;
  copyLabel: string;
  copiedLabel: string;
  showLabel: string;
  hideLabel: string;
  deleteLabel: string;
  onDelete: (id: string) => void;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="py-3 px-4">{apiKey.name}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs text-muted">
            {isRevealed ? apiKey.key : `${apiKey.prefix}…`}
          </code>
          <button
            onClick={() => setIsRevealed((v) => !v)}
            aria-label={isRevealed ? hideLabel : showLabel}
            className="text-muted hover:text-foreground transition-colors"
          >
            {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          <button
            onClick={handleCopy}
            aria-label={copyLabel}
            className="text-muted hover:text-foreground transition-colors text-xs flex items-center gap-1"
          >
            <Copy className="size-3.5" />
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>
      </td>
      <td className="py-3 px-4 whitespace-nowrap text-muted">{formatDate(apiKey.createdAt, locale)}</td>
      <td className="py-3 px-4 whitespace-nowrap text-muted">{formatDate(apiKey.lastUsedAt, locale)}</td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => onDelete(apiKey._id)}
          aria-label={deleteLabel}
          className="text-muted hover:text-danger transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}

export function ApiKeysManager() {
  const { t, locale } = useT();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/api-keys")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: ApiKeyItem[]) => setKeys(data))
      .catch(() => setKeys([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await readMessage(response, t("apiKeys.createError")));
      const created = (await response.json()) as ApiKeyItem;
      setKeys((prev) => [{ ...created, lastUsedAt: null }, ...prev]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("apiKeys.createError"));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("apiKeys.deleteConfirm"))) return;
    const response = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (response.ok) setKeys((prev) => prev.filter((key) => key._id !== id));
    else setError(await readMessage(response, t("apiKeys.deleteError")));
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleCreate} className="rounded-xl border border-border bg-surface p-5">
        <p className="font-medium">{t("apiKeys.createNew")}</p>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("apiKeys.namePlaceholder")}
            maxLength={60}
            required
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 font-medium transition-colors disabled:opacity-50"
          >
            {isCreating ? t("apiKeys.creating") : t("apiKeys.create")}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-sm text-muted">{t("common.loading")}</p>
        ) : keys.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center px-6">
            <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
              <KeyRound className="size-5 text-primary" />
            </div>
            <p className="mt-4 font-medium">{t("apiKeys.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("apiKeys.emptySub")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border text-muted">
                  <th className="py-2 px-4 font-medium">{t("apiKeys.colName")}</th>
                  <th className="py-2 px-4 font-medium">{t("apiKeys.colKey")}</th>
                  <th className="py-2 px-4 font-medium">{t("apiKeys.colCreated")}</th>
                  <th className="py-2 px-4 font-medium">{t("apiKeys.colLastUsed")}</th>
                  <th className="py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <KeyRow
                    key={key._id}
                    apiKey={key}
                    locale={locale}
                    copyLabel={t("apiKeys.copy")}
                    copiedLabel={t("apiKeys.copied")}
                    showLabel={t("apiKeys.show")}
                    hideLabel={t("apiKeys.hide")}
                    deleteLabel={t("apiKeys.delete")}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
