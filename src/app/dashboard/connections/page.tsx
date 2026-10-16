"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, CircleCheck, CircleAlert, X } from "lucide-react";
import { ConnectProfileModal } from "@/components/modals/ConnectProfileModal";
import { useMockData } from "@/components/dashboard/MockDataContext";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import { PLATFORM_COLORS } from "@/lib/platforms";
import { deleteConnection as deleteConnectionApi } from "@/lib/connections-client";
import { useT } from "@/i18n/client";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

export default function ConnectionsPage() {
  const { t } = useT();
  const { connections, isLoadingConnections, addConnection, removeConnection } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Captured once on mount so the banner survives the router.replace() below
  // (which clears the query string but must not wipe the message).
  const [facebookConnected, setFacebookConnected] = useState(() => searchParams.get("facebook_connected"));
  const [facebookError, setFacebookError] = useState(() => searchParams.get("facebook_error"));

  useEffect(() => {
    if (searchParams.get("facebook_connected") || searchParams.get("facebook_error")) {
      router.replace("/dashboard/connections");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissBanner() {
    setFacebookConnected(null);
    setFacebookError(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("connections.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await deleteConnectionApi(id);
      removeConnection(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("connections.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("connections.subtitle")}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="size-4" />
          {t("connections.addProfile")}
        </button>
      </div>

      {facebookConnected && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CircleCheck className="size-4 shrink-0" />
          <span className="flex-1">{t("connections.fbConnected", { count: facebookConnected })}</span>
          <button onClick={dismissBanner} aria-label={t("common.close")} className="shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}
      {facebookError && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <CircleAlert className="size-4 shrink-0" />
          <span className="flex-1">{facebookError}</span>
          <button onClick={dismissBanner} aria-label={t("common.close")} className="shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}

      {isLoadingConnections ? (
        <p className="mt-8 text-sm text-muted">{t("common.loading")}</p>
      ) : connections.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 py-20 flex flex-col items-center text-center px-6">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Plus className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-medium">{t("connections.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted max-w-sm">{t("connections.emptySub")}</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="size-4" />
            {t("connections.firstProfile")}
          </button>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {connections.map((connection) => (
            <div
              key={connection._id}
              className="rounded-xl border border-border bg-surface p-5 flex items-center gap-3"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: PLATFORM_COLORS[connection.platform] ?? "#6366f1" }}
              >
                {platformName(connection.platform).slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{platformName(connection.platform)}</p>
                <p className="text-xs text-muted truncate">{connection.label}</p>
              </div>
              <button
                onClick={() => handleDelete(connection._id)}
                disabled={deletingId === connection._id}
                className="p-2 rounded-md text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                aria-label={t("common.delete")}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ConnectProfileModal onClose={() => setIsModalOpen(false)} onConnect={addConnection} />
      )}
    </div>
  );
}
