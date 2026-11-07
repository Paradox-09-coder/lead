"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchCrmFields,
  fetchCrmSources,
  fetchCrmStages,
  type CrmField,
  type CrmSource,
  type CrmStage,
} from "@/lib/connections-client";
import { useT } from "@/i18n/client";

interface Loadable<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

const EMPTY = { items: [], isLoading: false, error: null };

// Loads one list from the CRM whenever `enabled` is on and `key` changes. A
// response that arrives after the key changed again is ignored, so picking
// another CRM never shows the previous one's stages or fields.
function useCrmList<T>(
  key: string,
  enabled: boolean,
  load: (key: string) => Promise<T[]>,
  fallbackError: string,
) {
  const [state, setState] = useState<Loadable<T>>(EMPTY);

  useEffect(() => {
    if (!enabled || !key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the list when the CRM is cleared
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState({ items: [], isLoading: true, error: null });
    load(key)
      .then((items) => {
        if (!cancelled) setState({ items, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ items: [], isLoading: false, error: err instanceof Error ? err.message : fallbackError });
      });
    return () => {
      cancelled = true;
    };
    // `load` and `fallbackError` are stable for a given CRM; only a new CRM re-fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const add = useCallback((item: T) => setState((previous) => ({ ...previous, items: [...previous.items, item] })), []);
  return { ...state, add };
}

export type CrmTargetData = ReturnType<typeof useCrmTarget>;

// Everything an integration needs to know about its target CRM: the stages a
// lead can land in, its lead fields, and (Bitrix24 only) its lead sources.
export function useCrmTarget(targetId: string, isBitrix: boolean) {
  const { t } = useT();
  const stages = useCrmList<CrmStage>(targetId, true, fetchCrmStages, t("integrationsPage.stagesError"));
  const sources = useCrmList<CrmSource>(targetId, isBitrix, fetchCrmSources, t("integrationsPage.sourcesError"));
  const fields = useCrmList<CrmField>(targetId, true, fetchCrmFields, t("integrationsPage.fieldsError"));

  return {
    stages: stages.items,
    isLoadingStages: stages.isLoading,
    stagesError: stages.error,
    sources: sources.items,
    isLoadingSources: sources.isLoading,
    sourcesError: sources.error,
    crmFields: fields.items,
    isLoadingFields: fields.isLoading,
    fieldsError: fields.error,
    // A field created from the mapping step joins the list the other pickers use.
    addCrmField: fields.add,
  };
}
