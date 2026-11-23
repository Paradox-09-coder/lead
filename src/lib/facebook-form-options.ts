import { FACEBOOK_GRAPH_VERSION } from "@/lib/facebook-oauth";

// For a multiple-choice question Facebook puts the option's KEY in a lead's field_data, not the text the person
// picked: "31-40" is fine, but "Ha, roziman" arrives as "ha,_roziman" and, in a form whose options were copied from
// another form, the key can be unrelated to the label ("21-30" arrives as "uyga_"). The labels live in the form's
// definition, so answers are translated with it before they reach the CRM.

// question key → option key → label shown to the person
export type OptionLabels = Record<string, Record<string, string>>;

export interface ChoiceAnswer {
  name: string;
  values?: string[];
}

interface GraphOption {
  key?: string;
  value?: string;
}

interface GraphQuestion {
  key?: string;
  options?: GraphOption[];
}

const CACHE_TTL_MS = 10 * 60 * 1000;
// If Facebook cannot be asked, answers go out untranslated; try again soon rather than on every lead.
const FAILURE_TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; labels: OptionLabels }>();

// The option labels of every multiple-choice question of a form. Cached for ten minutes per form: a catch-up
// delivers hundreds of leads of one form in a row. Never throws; an unreachable Facebook means no labels.
export async function loadOptionLabels(formId: string, pageAccessToken: string): Promise<OptionLabels> {
  const cached = cache.get(formId);
  if (cached && Date.now() - cached.at < cached.ttl) return cached.labels;

  try {
    const url = new URL(`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${formId}`);
    url.searchParams.set("fields", "questions");
    url.searchParams.set("access_token", pageAccessToken);
    const response = await fetch(url);
    const body = (await response.json()) as { questions?: GraphQuestion[]; error?: { message: string } };
    if (!response.ok || body.error) throw new Error(body.error?.message ?? `Facebook HTTP ${response.status}`);

    const labels: OptionLabels = {};
    for (const question of body.questions ?? []) {
      if (!question.key || !question.options?.length) continue;
      const byKey: Record<string, string> = {};
      for (const option of question.options) {
        if (option.key && option.value) byKey[option.key] = option.value;
      }
      if (Object.keys(byKey).length > 0) labels[question.key] = byKey;
    }
    cache.set(formId, { at: Date.now(), ttl: CACHE_TTL_MS, labels });
    return labels;
  } catch (error) {
    console.warn("[facebook-form-options] could not load the form's option labels:", error instanceof Error ? error.message : error);
    cache.set(formId, { at: Date.now(), ttl: FAILURE_TTL_MS, labels: {} });
    return {};
  }
}

// Replaces each choice answer's option key by its label. The same key can mean different things in two questions
// ("uyga_" is "21-30" for the age and "Ha, 1 yildan ko'p" for experience), so only the answer's own question is
// consulted. Free-text answers and keys the form no longer lists are left as they are.
export function translateChoiceAnswers<T extends ChoiceAnswer>(answers: T[], labels: OptionLabels): T[] {
  if (Object.keys(labels).length === 0) return answers;
  return answers.map((answer) => {
    const byKey = labels[answer.name];
    if (!byKey || !answer.values) return answer;
    return { ...answer, values: answer.values.map((value) => byKey[value] ?? value) };
  });
}
