"use client";

import { useState } from "react";
import { FolderOpen, Plus, ArrowRight, Pause, Play, Pencil, Trash2 } from "lucide-react";
import { NewIntegrationModal } from "@/components/modals/NewIntegrationModal";
import { EditIntegrationModal } from "@/components/modals/EditIntegrationModal";
import { useMockData } from "@/components/dashboard/MockDataContext";
import type { Integration } from "@/lib/integrations-client";

const ICON_BUTTON = "p-1.5 rounded-md text-muted hover:bg-surface-hover transition-colors";

export default function IntegrationsPage() {
  const { integrations, addIntegration, editIntegration, removeIntegration, connections } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  }

  function handleDelete(integration: Integration) {
    if (!window.confirm(`"${integration.name}" integratsiyasini o'chirasizmi? Bu forma lidlari CRM'ga yuborilmay qoladi.`)) {
      return;
    }
    void run(() => removeIntegration(integration._id));
  }

  function handleToggle(integration: Integration) {
    void run(() =>
      editIntegration(integration._id, { status: integration.status === "active" ? "paused" : "active" }),
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integratsiyalar</h1>
          <p className="mt-1 text-sm text-muted">
            Lead yig&apos;ish va CPA platformalarga yuborish uchun integratsiyalarni boshqaring
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="size-4" />
          Yangi integratsiya
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {integrations.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 py-20 flex flex-col items-center text-center px-6">
          <div className="size-12 rounded-full bg-primary/15 flex items-center justify-center">
            <FolderOpen className="size-5 text-primary" />
          </div>
          <p className="mt-4 font-medium">Hali integratsiya qo&apos;shilmagan</p>
          <p className="mt-1 text-sm text-muted max-w-sm">
            Facebook, Webhook orqali lead yig&apos;ing va CPA platformalarga avtomatik yuborishni boshlang
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-5 flex items-center gap-2 rounded-md bg-primary hover:bg-primary-hover text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            <Plus className="size-4" />
            Birinchi integratsiyani qo&apos;shish
          </button>
        </div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration._id} className="rounded-xl border border-border bg-surface p-5 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium truncate">{integration.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`mr-2 text-xs px-2 py-0.5 rounded-full ${
                      integration.status === "active"
                        ? "bg-success/15 text-success"
                        : "bg-surface-hover text-muted"
                    }`}
                  >
                    {integration.status === "active" ? "Faol" : (
                      <span className="flex items-center gap-1">
                        <Pause className="size-3" /> To&apos;xtatilgan
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleToggle(integration)}
                    className={ICON_BUTTON}
                    aria-label={integration.status === "active" ? "To'xtatish" : "Yoqish"}
                    title={integration.status === "active" ? "To'xtatish" : "Yoqish"}
                  >
                    {integration.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(integration)}
                    className={ICON_BUTTON}
                    aria-label="Tahrirlash"
                    title="Tahrirlash"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(integration)}
                    className={`${ICON_BUTTON} hover:text-danger`}
                    aria-label="O'chirish"
                    title="O'chirish"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                <span>{integration.source}</span>
                <ArrowRight className="size-3.5 shrink-0" />
                <span>{integration.target}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewIntegrationModal
          connections={connections}
          onClose={() => setIsModalOpen(false)}
          onCreate={addIntegration}
        />
      )}

      {editing && (
        <EditIntegrationModal
          integration={editing}
          connections={connections}
          onClose={() => setEditing(null)}
          onSave={(input) => editIntegration(editing._id, input)}
        />
      )}
    </div>
  );
}
