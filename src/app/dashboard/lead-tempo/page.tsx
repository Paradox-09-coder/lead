import Link from "next/link";
import { Inbox } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Lead, type LeadStatus } from "@/models/Lead";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { StatusBadge } from "@/components/StatusBadge";
import { RetryButton } from "@/components/RetryButton";
import { leadSourceKey } from "@/lib/public-lead";
import { FacebookSyncBar } from "@/components/FacebookSyncBar";
import { Integration } from "@/models/Integration";
import { Card, EmptyState, PageHeader, SegmentedLinks } from "@/components/ui/glass";

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

  // Facebook leads stored before formName existed: look the form up via the integration.
  const missingFormIds = [
    ...new Set(
      leads.filter((l) => l.source === "facebook" && !l.formName && l.integration).map((l) => l.integration!.toString()),
    ),
  ];
  const integrationFormNames = new Map(
    missingFormIds.length > 0
      ? (await Integration.find({ _id: { $in: missingFormIds } }).select("formName")).map((i) => [
          i._id.toString(),
          i.formName,
        ])
      : [],
  );
  const formLabel = (lead: (typeof leads)[number]) =>
    lead.webFormName ??
    lead.formName ??
    (lead.integration ? integrationFormNames.get(lead.integration.toString()) : undefined);

  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";

  return (
    <div>
      <PageHeader title={t("leadTempo.title")} subtitle={t("leadTempo.subtitle")} />

      <FacebookSyncBar />

      <div className="mt-4">
        <SegmentedLinks
          label={t("leadTempo.title")}
          value={activeFilter}
          options={FILTER_VALUES.map((value) => ({
            value,
            label: t(FILTER_LABEL_KEYS[value]),
            href: value === "all" ? "/dashboard/lead-tempo" : `/dashboard/lead-tempo?status=${value}`,
          }))}
        />
      </div>

      <Card className="mt-4" dense flush>
        {leads.length === 0 ? (
          <EmptyState icon={Inbox} title={t("leadTempo.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("leadTempo.colDate")}</th>
                  <th>{t("leadTempo.colLead")}</th>
                  <th>{t("leadTempo.colSource")}</th>
                  <th>{t("leadTempo.colStatus")}</th>
                  <th>{t("leadTempo.colCrmId")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const id = lead._id.toString();
                  return (
                    <tr key={id}>
                      <td className="text-ink-3">{lead.createdAt.toLocaleString(localeTag)}</td>
                      <td>
                        <Link href={`/dashboard/lead-tempo/${id}`} className="font-medium hover:underline">
                          {lead.fields?.name || lead.fields?.phone || lead.fields?.email || t("leadTempo.unnamed")}
                        </Link>
                        {lead.fields?.phone && lead.fields?.name && (
                          <p className="text-xs text-ink-3">{lead.fields.phone}</p>
                        )}
                      </td>
                      <td>
                        {t(leadSourceKey(lead.source))}
                        {formLabel(lead) && <p className="text-xs text-ink-3">{formLabel(lead)}</p>}
                      </td>
                      <td>
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="num">
                        {lead.crmLeadId ?? "—"}
                        {lead.crmDuplicate && <p className="text-xs text-ink-3">{t("leadTempo.crmDuplicate")}</p>}
                      </td>
                      <td className="r">{lead.status === "failed" && <RetryButton leadId={id} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
