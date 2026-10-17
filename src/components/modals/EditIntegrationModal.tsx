"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import { fetchCrmStages, type Connection, type CrmStage } from "@/lib/connections-client";
import type { Integration, UpdateIntegrationInput } from "@/lib/integrations-client";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

export function EditIntegrationModal({
  integration,
  connections,
  onClose,
  onSave,
}: {
  integration: Integration;
  connections: Connection[];
  onClose: () => void;
  onSave: (input: UpdateIntegrationInput) => Promise<void>;
}) {
  const crmConnections = connections.filter((c) => c.platform === "bitrix24" || c.platform === "amocrm");

  const [name, setName] = useState(integration.name);
  // A stale integration may point at a deleted CRM; start empty so the user picks a live one.
  const [target, setTarget] = useState(
    crmConnections.some((c) => c._id === integration.targetConnectionId) ? integration.targetConnectionId : "",
  );
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageId, setStageId] = useState(integration.stageId ?? "");
  const [duplicateCheck, setDuplicateCheck] = useState(integration.duplicateCheck);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingStages(true);
    setStagesError(null);
    fetchCrmStages(target)
      .then(setStages)
      .catch((err) => setStagesError(err instanceof Error ? err.message : "Bosqichlar olinmadi"))
      .finally(() => setIsLoadingStages(false));
  }, [target]);

  function handleTargetChange(id: string) {
    setTarget(id);
    setStages([]);
    setStageId("");
    setStagesError(null);
  }

  async function handleSave() {
    if (!name.trim() || !target) {
      setError("Nom va CRM tanlanishi shart");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ name, targetConnectionId: target, stageId: stageId || null, duplicateCheck });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlanmadi");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title="Integratsiyani tahrirlash" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nomi</label>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={INPUT_CLASS} />
        </div>

        <div>
          <label className="block text-sm font-medium">Manba</label>
          <p className="mt-1.5 text-sm text-muted">{integration.source}</p>
          <p className="mt-1 text-xs text-muted">
            Facebook sahifa va formani o&apos;zgartirib bo&apos;lmaydi — buning uchun yangi integratsiya yarating.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            Lead qayerga yuborilsin? <span className="text-danger">*</span>
          </label>
          <select value={target} onChange={(event) => handleTargetChange(event.target.value)} className={INPUT_CLASS}>
            <option value="" className="bg-surface">
              CRM tanlang
            </option>
            {crmConnections.map((c) => (
              <option key={c._id} value={c._id} className="bg-surface">
                {platformName(c.platform)} — {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Boshlang&apos;ich bosqich (status)</label>
          <select
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
            disabled={!target || isLoadingStages}
            className={INPUT_CLASS}
          >
            <option value="" className="bg-surface">
              {!target ? "Avval CRM tanlang" : isLoadingStages ? "Yuklanmoqda..." : "Standart bosqich"}
            </option>
            {stages.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface">
                {s.name}
              </option>
            ))}
          </select>
          {isLoadingStages && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <RefreshCw className="size-3 animate-spin" />
              CRM&apos;dan bosqichlar olinmoqda...
            </p>
          )}
          {stagesError && <p className="mt-1.5 text-xs text-danger">{stagesError}</p>}
        </div>

        <label className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <span className="text-sm">Duplicate tekshiruv</span>
          <button
            type="button"
            onClick={() => setDuplicateCheck((value) => !value)}
            className={`w-10 h-6 shrink-0 rounded-full transition-colors relative ${
              duplicateCheck ? "bg-primary" : "bg-surface-hover"
            }`}
          >
            <span
              className={`absolute top-1 left-1 size-4 rounded-full bg-white transition-transform ${
                duplicateCheck ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
