"use client";

import { useEffect, useState } from "react";
import { Copy, FileInput, Plus, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { NewWebFormModal, type WebFormItem } from "@/components/modals/NewWebFormModal";

async function readMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

function FormCard({ form, onDelete }: { form: WebFormItem; onDelete: (id: string) => void }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(form.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-medium truncate">{form.name}</p>
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
            {t(`webForms.source_${form.source}`)}
          </span>
        </div>
        <button
          onClick={() => onDelete(form._id)}
          aria-label={t("webForms.delete")}
          className="text-muted hover:text-danger transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">
        {form.target} · {form.createdAt.slice(0, 10)}
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <code className="flex-1 min-w-0 truncate text-xs text-muted">{form.url}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Copy className="size-3.5" />
          {copied ? t("webForms.copied") : t("webForms.copy")}
        </button>
      </div>
    </div>
  );
}

export function WebFormsManager() {
  const { t } = useT();
  const [forms, setForms] = useState<WebFormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/forms")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: WebFormItem[]) => setForms(data))
      .catch(() => setForms([]))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm(t("webForms.deleteConfirm"))) return;
    setError(null);
    const response = await fetch(`/api/forms/${id}`, { method: "DELETE" });
    if (response.ok) setForms((prev) => prev.filter((form) => form._id !== id));
    else setError(await readMessage(response, t("webForms.deleteError")));
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("webForms.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("webForms.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          {t("webForms.newForm")}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">{t("common.loading")}</p>
      ) : forms.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 py-20 flex flex-col items-center text-center px-6">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <FileInput className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-medium">{t("webForms.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted max-w-sm">{t("webForms.emptySub")}</p>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          {forms.map((form) => (
            <FormCard key={form._id} form={form} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewWebFormModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(form) => setForms((prev) => [form, ...prev])}
        />
      )}
    </div>
  );
}
