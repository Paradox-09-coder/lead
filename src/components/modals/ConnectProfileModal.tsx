"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft, Lock, ExternalLink, RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import { PLATFORM_COLORS } from "@/lib/platforms";
import { createBitrix24Connection, createAmoCrmConnection, type Connection } from "@/lib/connections-client";

function PlatformBadge({ id, name }: { id: string; name: string }) {
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
      style={{ backgroundColor: PLATFORM_COLORS[id] ?? "#6366f1" }}
    >
      {name.slice(0, 2)}
    </span>
  );
}

export function ConnectProfileModal({
  onClose,
  onConnect,
}: {
  onClose: () => void;
  onConnect: (connection: Connection) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platform = CONNECT_PLATFORMS.find((p) => p.id === selectedId);

  function selectPlatform(id: string) {
    setSelectedId(id);
    setError(null);
  }

  function goBack() {
    setSelectedId(null);
    setError(null);
  }

  async function handleConnectBitrix24() {
    setIsSubmitting(true);
    setError(null);
    try {
      const connection = await createBitrix24Connection(webhookUrl);
      onConnect(connection);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ulanmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConnectAmoCrm() {
    setIsSubmitting(true);
    setError(null);
    try {
      const connection = await createAmoCrmConnection(accountUrl, jwtToken);
      onConnect(connection);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ulanmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!platform) {
    return (
      <Modal title="Profil ulash" onClose={onClose}>
        <p className="text-sm text-muted mb-4">Qaysi platformani ulamoqchisiz?</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CONNECT_PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => !p.locked && selectPlatform(p.id)}
              disabled={p.locked}
              className={`text-left rounded-lg border border-border p-4 transition-colors ${
                p.locked ? "opacity-60 cursor-not-allowed" : "hover:border-primary/50 hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PlatformBadge id={p.id} name={p.name} />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-primary">{p.authType}</p>
                  </div>
                </div>
                {p.locked ? <Lock className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />}
              </div>
              <p className="mt-2 text-xs text-muted">{p.description}</p>
              {p.locked && (
                <p className="mt-2 text-xs text-warning">Telegram bot ulash faqat pullik tariflarda mavjud</p>
              )}
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Profil ulash" onClose={onClose}>
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ChevronLeft className="size-4" />
        Orqaga
      </button>

      <div className="flex items-center gap-3 mb-6">
        <PlatformBadge id={platform.id} name={platform.name} />
        <div>
          <p className="font-medium">{platform.name}</p>
          <p className="text-xs text-muted">{platform.description}</p>
        </div>
      </div>

      {platform.id === "facebook" && (
        <div className="text-center py-6">
          <p className="text-sm text-muted">
            Facebook&apos;ning o&apos;z oynasi ochiladi — u yerda o&apos;z akkauntingiz bilan kirib, sahifalaringizga
            ruxsat berasiz.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this hits an API route that issues a server redirect to Facebook's OAuth dialog, not a page */}
          <a
            href="/api/connections/facebook/start"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm transition-colors"
          >
            <ExternalLink className="size-4" />
            Facebook bilan davom etish
          </a>
        </div>
      )}

      {platform.id === "google" && (
        <div className="text-center py-6">
          <p className="text-sm text-muted">
            {platform.name} bilan ulanish brauzer orqali ochiladigan OAuth oynasi orqali amalga oshadi. Bu funksiya
            tez orada faollashadi.
          </p>
          <button
            disabled
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary/50 text-white px-4 py-2 text-sm cursor-not-allowed"
          >
            <ExternalLink className="size-4" />
            {platform.name} bilan davom etish
          </button>
        </div>
      )}

      {platform.id === "bitrix24" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Webhook URL</label>
            <input
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://yourcompany.bitrix24.com/rest/1/xxxxx/"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted">
              Bitrix24&apos;da: Ilovalar → Ishlab chiquvchi resurslari → Kiruvchi webhook
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={handleConnectBitrix24}
            disabled={!webhookUrl || isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting && <RefreshCw className="size-4 animate-spin" />}
            {isSubmitting ? "Tekshirilmoqda..." : "Ulash"}
          </button>
        </div>
      )}

      {platform.id === "amocrm" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Account URL</label>
            <input
              value={accountUrl}
              onChange={(event) => setAccountUrl(event.target.value)}
              placeholder="https://mycompany.amocrm.ru yoki https://mycompany.kommo.com"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Long-lived JWT token</label>
            <input
              value={jwtToken}
              onChange={(event) => setJwtToken(event.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted">
              amoCRM&apos;da: Sozlamalar → Integratsiyalar → Yangi qo&apos;shish → Kalitlar va doiralar
            </p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            onClick={handleConnectAmoCrm}
            disabled={!accountUrl || !jwtToken || isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-2.5 text-sm font-medium transition-colors"
          >
            {isSubmitting && <RefreshCw className="size-4 animate-spin" />}
            {isSubmitting ? "Tekshirilmoqda..." : "Ulash"}
          </button>
        </div>
      )}
    </Modal>
  );
}
