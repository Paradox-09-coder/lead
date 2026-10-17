import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { Lead, type LeadStatus } from "@/models/Lead";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { StatusBadge } from "@/components/StatusBadge";
import { RetryButton } from "@/components/RetryButton";
import { leadSourceKey } from "@/lib/public-lead";

const FILTER_VALUES: Array<LeadStatus | "all"> = ["all", "success", "failed", "pending", "saved"];

const FILTER_LABEL_KEYS: Record<LeadStatus | "all", string> = {
  all: "leadTempo.filterAll",
  success: "leadTempo.filterSuccess",
  failed: "leadTempo.filterFailed",
  pending: "leadTempo.filterPending",
  saved: "leadTempo.filterSaved",
};

export default async function LeadTempoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { t, locale } = await getT();
  const { status } = await searchParams;
  const activeFilter = (FILTER_VALUES as readonly string[]).includes(status ?? "")
    ? (status as LeadStatus | "all")
    : "all";

  const userId = await getSessionUserId();
  await connectDB();
  const leads = userId
    ? await Lead.find({ user: userId, ...(activeFilter !== "all" ? { status: activeFilter } : {}) })
        .sort({ createdAt: -1 })
        .limit(100)
    : [];

  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">{t("leadTempo.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("leadTempo.subtitle")}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_VALUES.map((value) => (
          <Link
            key={value}
            href={value === "all" ? "/dashboard/lead-tempo" : `/dashboard/lead-tempo?status=${value}`}
            className={`text-sm rounded-md px-3 py-1.5 border transition-colors ${
              activeFilter === value
                ? "border-primary bg-primary text-white"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            {t(FILTER_LABEL_KEYS[value])}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 text-muted">{t("leadTempo.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted">
                <th className="py-2 px-4 font-medium">{t("leadTempo.colDate")}</th>
                <th className="py-2 px-4 font-medium">{t("leadTempo.colLead")}</th>
                <th className="py-2 px-4 font-medium">{t("leadTempo.colSource")}</th>
                <th className="py-2 px-4 font-medium">{t("leadTempo.colStatus")}</th>
                <th className="py-2 px-4 font-medium">{t("leadTempo.colCrmId")}</th>
                <th className="py-2 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const id = lead._id.toString();
                return (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 whitespace-nowrap text-muted">
                      {lead.createdAt.toLocaleString(localeTag)}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/lead-tempo/${id}`} className="hover:underline">
                        {lead.fields?.name || lead.fields?.phone || lead.fields?.email || t("leadTempo.unnamed")}
                      </Link>
                      {lead.fields?.phone && lead.fields?.name && (
                        <p className="text-xs text-muted">{lead.fields.phone}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {t(leadSourceKey(lead.source))}
                      {lead.webFormName && <p className="text-xs text-muted">{lead.webFormName}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3 px-4">{lead.crmLeadId ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      {lead.status === "failed" && <RetryButton leadId={id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
