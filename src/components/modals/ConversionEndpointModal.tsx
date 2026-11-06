"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modals/Modal";
import { Select } from "@/components/ui/Select";
import { CONVERSION_CURRENCIES, CONVERSION_EVENT_NAMES } from "@/lib/conversion-options";
import {
  createEndpoint,
  updateEndpoint,
  type ConversionEndpointItem,
  type EndpointInput,
} from "@/lib/conversions-client";
import { useT } from "@/i18n/client";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50";

// Adds a conversion endpoint, or edits `endpoint` when given. When editing, an
// empty token field keeps the stored token.
export function ConversionEndpointModal({
  endpoint,
  onClose,
  onSaved,
}: {
  endpoint?: ConversionEndpointItem;
  onClose: () => void;
  onSaved: (endpoint: ConversionEndpointItem) => void;
}) {
  const { t } = useT();
  const isEditing = Boolean(endpoint);

  const [name, setName] = useState(endpoint?.name ?? "");
  const [pixelId, setPixelId] = useState(endpoint?.pixelId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [eventName, setEventName] = useState<EndpointInput["eventName"]>(endpoint?.eventName ?? "Purchase");
  const [currency, setCurrency] = useState<EndpointInput["currency"]>(endpoint?.currency ?? "USD");
  const [countryCode, setCountryCode] = useState(endpoint?.countryCode ?? "998");
  const [testEventCode, setTestEventCode] = useState(endpoint?.testEventCode ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const input: EndpointInput = {
        name,
        pixelId,
        eventName,
        currency,
        countryCode,
        testEventCode,
        ...(accessToken.trim() ? { accessToken } : {}),
      };
      const saved = endpoint ? await updateEndpoint(endpoint._id, input) : await createEndpoint(input);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("conversions.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={isEditing ? t("conversions.modalEdit") : t("conversions.modalCreate")}
      onClose={onClose}
      widthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="ce-name">
            {t("conversions.nameLabel")} <span className="text-danger">*</span>
          </label>
          <input
            id="ce-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("conversions.namePlaceholder")}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="ce-pixel">
            {t("conversions.pixel")} <span className="text-danger">*</span>
          </label>
          <input
            id="ce-pixel"
            required
            inputMode="numeric"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder={t("conversions.pixelPlaceholder")}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="ce-token">
            {t("conversions.token")} {!isEditing && <span className="text-danger">*</span>}
          </label>
          <input
            id="ce-token"
            type="password"
            autoComplete="off"
            required={!isEditing}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={isEditing ? t("conversions.tokenKeep") : t("conversions.tokenPlaceholder")}
            className={INPUT_CLASS}
          />
          <p className="mt-1.5 text-xs text-muted">
            {isEditing && endpoint?.tokenHint
              ? `${t("conversions.tokenEnding", { hint: endpoint.tokenHint })} · `
              : ""}
            {t("conversions.tokenHelp")}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">{t("conversions.event")}</label>
            <Select value={eventName} onChange={(value) => setEventName(value as typeof eventName)}>
              {CONVERSION_EVENT_NAMES.map((name) => (
                <option key={name} value={name} className="bg-surface">
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium">{t("conversions.currency")}</label>
            <Select value={currency} onChange={(value) => setCurrency(value as typeof currency)}>
              {CONVERSION_CURRENCIES.map((code) => (
                <option key={code} value={code} className="bg-surface">
                  {code}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="ce-country">
              {t("conversions.countryCode")}
            </label>
            <input
              id="ce-country"
              required
              inputMode="numeric"
              maxLength={4}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="ce-test">
              {t("conversions.testCode")}
            </label>
            <input
              id="ce-test"
              maxLength={40}
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder="TEST12345"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">
          {t("conversions.countryCodeHint")} {t("conversions.testCodeHint")}
        </p>

        {error && <p className="text-sm text-danger break-words">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-5 py-2 text-sm font-medium transition-colors"
          >
            {isSaving ? t("conversions.saving") : t("conversions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
