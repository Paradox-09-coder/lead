"use client";

import { useEffect, useState } from "react";
import { Copy, Pause, Pencil, Play, Plus, Trash2, Webhook } from "lucide-react";
import { ConversionEndpointModal } from "@/components/modals/ConversionEndpointModal";
import { StatusBadge } from "@/components/StatusBadge";
import {
  deleteEndpoint,
  fetchEndpoints,
  fetchRecentEvents,
  updateEndpoint,
  type ConversionEndpointItem,
  type ConversionEventItem,
} from "@/lib/conversions-client";
import { useT } from "@/i18n/client";

const ICON_BUTTON = "p-1.5 rounded-md text-muted hover:bg-surface-hover transition-colors";

function exampleRequest(url: string): string {
  return [
    `curl -X POST "${url}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"full_name":"Ali Valiyev","phone_number":"+998901234567","summa":1500000}'`,
  ].join("\n");
}

function EndpointCard({
  endpoint,
  onEdit,
  onToggle,
  onDelete,
}: {
  endpoint: ConversionEndpointItem;
  onEdit: (endpoint: ConversionEndpointItem) => void;
  onToggle: (endpoint: ConversionEndpointItem) => void;
  onDelete: (endpoint: ConversionEndpointItem) => void;
}) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const isActive = endpoint.status === "active";

  async function handleCopy() {
    await navigator.clipboard.writeText(endpoint.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <p className="font-medium truncate">{endpoint.name}</p>
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
              isActive ? "bg-success/15 text-success" : "bg-surface-hover text-muted"
            }`}
          >
            {isActive ? t("conversions.active") : t("conversions.paused")}
          </span>
          {endpoint.testEventCode && (
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">
              {t("conversions.testMode")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onToggle(endpoint)}
            className={ICON_BUTTON}
            aria-label={isActive ? t("conversions.pause") : t("conversions.resume")}
            title={isActive ? t("conversions.pause") : t("conversions.resume")}
          >
            {isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            onClick={() => onEdit(endpoint)}
            className={ICON_BUTTON}
            aria-label={t("conversions.edit")}
            title={t("conversions.edit")}
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(endpoint)}
            className={`${ICON_BUTTON} hover:text-danger`}
            aria-label={t("conversions.delete")}
            title={t("conversions.delete")}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-muted break-words">
        {endpoint.pixelName ? `${endpoint.pixelName} · ` : ""}
        {endpoint.pixelId} · {endpoint.eventName} · {endpoint.currency}
        {endpoint.tokenHint ? ` · ${t("conversions.tokenEnding", { hint: endpoint.tokenHint })}` : ""}
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <code className="flex-1 min-w-0 truncate text-xs text-muted" title={endpoint.url}>
          {endpoint.url}
        </code>
        <button onClick={handleCopy} className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline">
          <Copy className="size-3.5" />
          {copied ? t("conversions.copied") : t("conversions.copy")}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted">{t("conversions.params")}</p>
        <ul className="mt-1.5 space-y-1 text-xs">
          <li>
            <code className="text-foreground">full_name</code> <span className="text-muted">— {t("conversions.paramFullName")}</span>
          </li>
          <li>
            <code className="text-foreground">phone_number</code> <span className="text-muted">— {t("conversions.paramPhone")}</span>
          </li>
          <li>
            <code className="text-foreground">summa</code> <span className="text-muted">— {t("conversions.paramSumma")}</span>
          </li>
          <li>
            <code className="text-foreground">event_id</code> <span className="text-muted">— {t("conversions.paramEventId")}</span>
          </li>
        </ul>
      </div>

      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-primary hover:underline">{t("conversions.example")}</summary>
        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed">
          {exampleRequest(endpoint.url)}
        </pre>
      </details>
    </div>
  );
}

export function ConversionsManager() {
  const { t, locale } = useT();
  const [endpoints, setEndpoints] = useState<ConversionEndpointItem[]>([]);
  const [events, setEvents] = useState<ConversionEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ endpoint?: ConversionEndpointItem } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchEndpoints(), fetchRecentEvents()])
      .then(([loadedEndpoints, loadedEvents]) => {
        if (cancelled) return;
        setEndpoints(loadedEndpoints);
        setEvents(loadedEvents);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("conversions.loadError"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("conversions.saveError"));
    }
  }

  function handleSaved(saved: ConversionEndpointItem) {
    setEndpoints((previous) =>
      previous.some((item) => item._id === saved._id)
        ? previous.map((item) => (item._id === saved._id ? saved : item))
        : [saved, ...previous],
    );
  }

  function handleToggle(endpoint: ConversionEndpointItem) {
    void run(async () => {
      handleSaved(await updateEndpoint(endpoint._id, { status: endpoint.status === "active" ? "paused" : "active" }));
    });
  }

  function handleDelete(endpoint: ConversionEndpointItem) {
    if (!window.confirm(t("conversions.deleteConfirm", { name: endpoint.name }))) return;
    void run(async () => {
      await deleteEndpoint(endpoint._id);
      setEndpoints((previous) => previous.filter((item) => item._id !== endpoint._id));
      setEvents((previous) => previous.filter((event) => event.endpointName !== endpoint.name));
    });
  }

  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(localeTag, {
      timeZone: "Asia/Tashkent",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("conversions.title")}</h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">{t("conversions.subtitle")}</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="self-start sm:self-auto flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          {t("conversions.newEndpoint")}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger break-words">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">{t("common.loading")}</p>
      ) : endpoints.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 py-20 flex flex-col items-center text-center px-6">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Webhook className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-medium">{t("conversions.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted max-w-sm">{t("conversions.emptySub")}</p>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <EndpointCard
              key={endpoint._id}
              endpoint={endpoint}
              onEdit={(item) => setModal({ endpoint: item })}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!isLoading && endpoints.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold">{t("conversions.recentTitle")}</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("conversions.recentEmpty")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border text-muted">
                    <th className="py-2 px-4 font-medium">{t("conversions.colDate")}</th>
                    <th className="py-2 px-4 font-medium">{t("conversions.colEndpoint")}</th>
                    <th className="py-2 px-4 font-medium">{t("conversions.colCustomer")}</th>
                    <th className="py-2 px-4 font-medium">{t("conversions.colSumma")}</th>
                    <th className="py-2 px-4 font-medium">{t("conversions.colStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id} className="border-b border-border last:border-0 align-top">
                      <td className="py-3 px-4 whitespace-nowrap text-muted">{formatDate(event.createdAt)}</td>
                      <td className="py-3 px-4">
                        {event.endpointName ?? "—"}
                        <p className="text-xs text-muted">{event.eventName}</p>
                      </td>
                      <td className="py-3 px-4">
                        {event.fullName ?? "—"}
                        {event.phone && <p className="text-xs text-muted">{event.phone}</p>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {event.summa !== null ? `${event.summa.toLocaleString("en-US")} ${event.currency ?? ""}` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={event.status} />
                          {event.test && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                              {t("conversions.testMode")}
                            </span>
                          )}
                        </div>
                        {event.error && <p className="mt-1 max-w-xs break-words text-xs text-danger">{event.error}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {modal && (
        <ConversionEndpointModal endpoint={modal.endpoint} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
