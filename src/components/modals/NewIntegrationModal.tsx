"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { Modal } from "@/components/modals/Modal";
import { CONNECT_PLATFORMS } from "@/lib/mock-data";
import {
  fetchFacebookForms,
  fetchCrmStages,
  type Connection,
  type FacebookLeadForm,
  type CrmStage,
} from "@/lib/connections-client";
import type { CreateIntegrationInput } from "@/lib/integrations-client";

function platformName(platform: string): string {
  return CONNECT_PLATFORMS.find((p) => p.id === platform)?.name ?? platform;
}

const STEPS = ["Manba", "Asosiy sozlamalar", "Maqsad"];

export function NewIntegrationModal({
  connections,
  onClose,
  onCreate,
}: {
  connections: Connection[];
  onClose: () => void;
  onCreate: (input: CreateIntegrationInput) => Promise<void>;
}) {
  const [step, setStep] = useState(0);

  const [source, setSource] = useState<"facebook" | "webhook" | "">("");
  const [facebookConnectionId, setFacebookConnectionId] = useState("");
  const [forms, setForms] = useState<FacebookLeadForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [target, setTarget] = useState("");
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageId, setStageId] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const facebookConnections = connections.filter((c) => c.platform === "facebook");
  const selectedConnection = facebookConnections.find((c) => c._id === facebookConnectionId);
  const crmConnections = connections.filter((c) => c.platform !== "facebook");
  const targetConnection = crmConnections.find((c) => c._id === target);

  useEffect(() => {
    if (!facebookConnectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingForms(true);
    setFormsError(null);
    fetchFacebookForms(facebookConnectionId)
      .then(setForms)
      .catch((err) => setFormsError(err instanceof Error ? err.message : "Formalar olinmadi"))
      .finally(() => setIsLoadingForms(false));
  }, [facebookConnectionId]);

  function handleFacebookConnectionChange(id: string) {
    setFacebookConnectionId(id);
    setForms([]);
    setFormId("");
    setFormsError(null);
  }

  useEffect(() => {
    const connection = crmConnections.find((c) => c._id === target);
    if (!connection) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard load-then-fetch pattern, not derived state
    setIsLoadingStages(true);
    setStagesError(null);
    fetchCrmStages(connection._id)
      .then(setStages)
      .catch((err) => setStagesError(err instanceof Error ? err.message : "Bosqichlar olinmadi"))
      .finally(() => setIsLoadingStages(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when the selected target id changes
  }, [target]);

  function handleTargetChange(id: string) {
    setTarget(id);
    setStages([]);
    setStageId("");
    setStagesError(null);
  }

  const canGoNext =
    (step === 0 && source !== "" && (source !== "facebook" || (facebookConnectionId !== "" && formId !== ""))) ||
    (step === 1 && formName !== "" && telegramChatId !== "") ||
    step === 2;

  async function handleSave() {
    if (source !== "facebook" || !selectedConnection || !formId) {
      setSaveError("Facebook sahifa va forma tanlanishi shart");
      return;
    }
    if (!targetConnection) {
      setSaveError("CRM tanlanishi shart");
      return;
    }

    const selectedForm = forms.find((f) => f.id === formId);
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate({
        name: formName || "Yangi integratsiya",
        facebookConnectionId: selectedConnection._id,
        formId,
        formName: selectedForm?.name ?? formId,
        targetConnectionId: targetConnection._id,
        stageId: stageId || undefined,
        duplicateCheck,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Integratsiya saqlanmadi");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal title="Integratsiya qo'shish" onClose={onClose} widthClassName="max-w-xl">
      <div className="flex items-center mb-8">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index < step
                    ? "bg-success text-white"
                    : index === step
                      ? "bg-primary text-white"
                      : "bg-surface-hover text-muted"
                }`}
              >
                {index < step ? <Check className="size-4" /> : index + 1}
              </div>
              <span className="text-xs text-muted whitespace-nowrap">{label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-px flex-1 mx-2 ${index < step ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Lead manbasi <span className="text-danger">*</span>
            </label>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as typeof source)}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="" className="bg-surface">
                Manbani tanlang
              </option>
              <option value="facebook" className="bg-surface">
                Facebook Lead Ads
              </option>
              <option value="webhook" className="bg-surface">
                Webhook
              </option>
            </select>
          </div>

          {source === "facebook" && (
            <>
              {facebookConnections.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Facebook sahifa</label>
                    <select
                      value={facebookConnectionId}
                      onChange={(event) => handleFacebookConnectionChange(event.target.value)}
                      className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="" className="bg-surface">
                        Sahifani tanlang
                      </option>
                      {facebookConnections.map((c) => (
                        <option key={c._id} value={c._id} className="bg-surface">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Forma</label>
                    <select
                      value={formId}
                      onChange={(event) => setFormId(event.target.value)}
                      disabled={!facebookConnectionId || isLoadingForms}
                      className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                    >
                      <option value="" className="bg-surface">
                        {isLoadingForms ? "Yuklanmoqda..." : "Formani tanlang"}
                      </option>
                      {forms.map((f) => (
                        <option key={f.id} value={f.id} className="bg-surface">
                          {f.name}
                        </option>
                      ))}
                    </select>
                    {isLoadingForms && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <RefreshCw className="size-3 animate-spin" />
                        Facebook&apos;dan formalar olinmoqda...
                      </p>
                    )}
                    {formsError && <p className="mt-1.5 text-xs text-danger">{formsError}</p>}
                    {!isLoadingForms && !formsError && facebookConnectionId && forms.length === 0 && (
                      <p className="mt-1.5 text-xs text-muted">Bu sahifada Lead formalar topilmadi.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-warning">
                  Avval{" "}
                  <Link href="/dashboard/connections" className="underline">
                    Facebook akkauntingizni ulang
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Forma nomi <span className="text-danger">*</span>
            </label>
            <input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="Masalan: Sotuvlar formasi"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Telegram Chat ID <span className="text-danger">*</span>
            </label>
            <input
              value={telegramChatId}
              onChange={(event) => setTelegramChatId(event.target.value)}
              placeholder="1304074546"
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
            <p className="mt-1.5 text-xs text-muted">
              Botni guruhga qo&apos;shib, /start yuboring — Chat ID shu yerda ko&apos;rinadi.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">Yetkazuvchi bot</label>
            <select className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option className="bg-surface">Asosiy bot (LeadSync) — standart</option>
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Lead qayerga yuborilsin? <span className="text-danger">*</span>
            </label>
            <select
              value={target}
              onChange={(event) => handleTargetChange(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="" className="bg-surface">
                CRM tanlang
              </option>
              {crmConnections.map((c) => (
                <option key={c._id} value={c._id} className="bg-surface">
                  {platformName(c.platform)} — {c.label}
                </option>
              ))}
            </select>
            {crmConnections.length === 0 && (
              <p className="mt-1.5 text-xs text-muted">
                Hali CRM ulanmagan —{" "}
                <Link href="/dashboard/connections" className="underline">
                  Ulanishlar
                </Link>{" "}
                bo&apos;limidan qo&apos;shing.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Boshlang&apos;ich bosqich (status)</label>
            <select
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
              disabled={!target || isLoadingStages}
              className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="" className="bg-surface">
                {!target ? "Avval CRM tanlang" : isLoadingStages ? "Yuklanmoqda..." : "Bosqichni tanlang"}
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
            {!isLoadingStages && !stagesError && target && stages.length === 0 && (
              <p className="mt-1.5 text-xs text-muted">Bu CRM&apos;da bosqichlar topilmadi.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Mas&apos;ul foydalanuvchi</label>
            <select className="mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary">
              <option className="bg-surface">Default (token egasi)</option>
            </select>
            <p className="mt-1.5 text-xs text-muted">
              Yangi lead CRM&apos;da kimga biriktirilishini belgilaydi. Hozircha faqat ulanish
              tokeni egasiga biriktiriladi — CRM foydalanuvchilarini tanlash imkoniyati keyinroq
              qo&apos;shiladi.
            </p>
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
        </div>
      )}

      {saveError && <p className="mt-4 text-sm text-danger">{saveError}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          Orqaga
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            Keyingisi
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        )}
      </div>
    </Modal>
  );
}
