import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { StatusBadge } from "@/components/StatusBadge";
import { RetryButton } from "@/components/RetryButton";
import { leadSourceKey } from "@/lib/public-lead";
import { translateMessage } from "@/i18n/messages";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { t, locale } = await getT();
  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";

  const userId = await getSessionUserId();
  await connectDB();
  const lead = userId ? await Lead.findOne({ _id: id, user: userId }).catch(() => null) : null;
  if (!lead) notFound();

  const details: Array<[string, string]> = [
    [t("leadTempo.fieldName"), lead.fields?.name ?? "—"],
    [t("leadTempo.fieldPhone"), lead.fields?.phone ?? "—"],
    [t("leadTempo.fieldEmail"), lead.fields?.email ?? "—"],
    [t("leadTempo.fieldSource"), t(leadSourceKey(lead.source))],
    [t("leadTempo.fieldCrmId"), lead.crmLeadId ?? "—"],
    [t("leadTempo.fieldRetries"), String(lead.retryCount)],
    [t("leadTempo.fieldCreated"), lead.createdAt.toLocaleString(localeTag)],
    [t("leadTempo.fieldUpdated"), lead.updatedAt.toLocaleString(localeTag)],
  ];
  if (lead.source === "facebook") {
    details.push([t("leadTempo.fieldPageId"), lead.pageId ?? "—"], [t("leadTempo.fieldFormId"), lead.formId ?? "—"]);
  }
  if (lead.source === "form") {
    details.push([t("leadTempo.fieldWebForm"), lead.webFormName ?? "—"]);
    for (const key of ["source", "medium", "campaign", "content", "term"] as const) {
      const value = lead.utm?.[key];
      if (value) details.push([`utm_${key}`, value]);
    }
  }

  return (
    <div>
      <Link href="/dashboard/lead-tempo" className="text-sm text-muted hover:underline">
        ← {t("leadTempo.backToList")}
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("leadTempo.detailsTitle")}</h1>
          {lead.leadgenId && <p className="mt-1 text-sm text-muted font-mono">{lead.leadgenId}</p>}
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="mt-1 break-all">{value}</dd>
          </div>
        ))}
      </dl>

      {lead.errorMessage && (
        <div className="mt-6 rounded-md border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">{t("leadTempo.errorTitle")}</p>
          <p className="mt-1 text-sm text-danger/90 font-mono whitespace-pre-wrap">{translateMessage(lead.errorMessage, locale)}</p>
        </div>
      )}

      {lead.status === "failed" && (
        <div className="mt-6">
          <RetryButton leadId={lead._id.toString()} />
        </div>
      )}

      {lead.rawFieldData != null && (
        <div className="mt-8">
          <h2 className="font-semibold">{t("leadTempo.rawTitle")}</h2>
          <pre className="mt-2 rounded-md bg-surface border border-border p-4 text-xs overflow-x-auto">
            {JSON.stringify(lead.rawFieldData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
