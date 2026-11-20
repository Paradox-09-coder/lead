import Link from "next/link";
import {
  CheckCircle2,
  ChartColumn,
  ChartPie,
  Copy,
  FileInput,
  Hourglass,
  Inbox,
  Link2,
  Megaphone,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { translateMessage } from "@/i18n/messages";
import { StatTile } from "@/components/dashboard/StatTile";
import { Badge, Card, EmptyState, Meter, PageHeader, SegmentedLinks } from "@/components/ui/glass";
import { LeadsTrendChart } from "@/components/charts/LeadsTrendChart";
import { SourceDonut } from "@/components/charts/SourceDonut";
import { leadSourceKey } from "@/lib/public-lead";
import { REPORT_PERIODS, REPORT_TIMEZONE, getLeadReport, type Counts, type ReportPeriod } from "@/lib/reports";

const PLATFORM_NAMES: Record<string, string> = { bitrix24: "Bitrix24", amocrm: "amoCRM / Kommo" };

const PERIOD_LABEL_KEYS: Record<ReportPeriod, string> = {
  "1": "reports.periodToday",
  "7": "reports.period7",
  "30": "reports.period30",
  "90": "reports.period90",
  all: "reports.periodAll",
};

// Same colour per source as the donut (SourceDonut.tsx): Facebook blue, web form violet, API amber.
const SOURCE_COLORS: Record<string, string> = {
  facebook: "var(--chart-1)",
  form: "var(--chart-3)",
  api: "var(--chart-5)",
};

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function SuccessBar({ counts }: { counts: Counts }) {
  const rate = percent(counts.success, counts.total);
  return (
    <div className="flex items-center gap-2">
      <Meter value={rate / 100} color="var(--good)" className="w-16" />
      <span className="num text-xs text-ink-3">{rate}%</span>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { t, locale } = await getT();
  const { period: periodParam } = await searchParams;
  const period: ReportPeriod = (REPORT_PERIODS as readonly string[]).includes(periodParam ?? "")
    ? (periodParam as ReportPeriod)
    : "30";

  const userId = await getSessionUserId();
  let report = null;
  if (userId) {
    await connectDB();
    report = await getLeadReport(userId, period);
  }

  const localeTag = locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US";
  const formatDate = (date: Date) => date.toLocaleString(localeTag, { timeZone: REPORT_TIMEZONE });
  const number = (value: number) => value.toLocaleString("en-US");
  const crmName = (label: string | null, platform: string | null) =>
    label ? `${label}${platform ? ` · ${PLATFORM_NAMES[platform] ?? platform}` : ""}` : t("reports.noCrm");

  const totals = report?.totals;
  const waiting = totals ? totals.pending + totals.saved : 0;

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <SegmentedLinks
            label={t("reports.title")}
            value={period}
            options={REPORT_PERIODS.map((value) => ({
              value,
              label: t(PERIOD_LABEL_KEYS[value]),
              href: value === "30" ? "/dashboard/reports" : `/dashboard/reports?period=${value}`,
            }))}
          />
        }
      />

      {!report || !totals || totals.total === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title={t("reports.empty")} />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile tile="blue" icon={Inbox} label={t("reports.statTotal")} value={number(totals.total)} />
            <StatTile
              tile="green"
              icon={CheckCircle2}
              label={t("reports.statDelivered")}
              value={number(totals.success)}
              trend={t("reports.statRate", { percent: percent(totals.success, totals.total) })}
            />
            <StatTile tile="pink" icon={XCircle} label={t("reports.statFailed")} value={number(totals.failed)} />
            <StatTile tile="orange" icon={Hourglass} label={t("reports.statWaiting")} value={number(waiting)} />
          </div>
          {totals.duplicates > 0 && (
            <p className="flex items-center gap-2 px-1 text-sm text-ink-2">
              <Copy className="size-4" />
              {t("reports.duplicatesNote", { count: number(totals.duplicates) })}
            </p>
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title={t("reports.chartTitle")} icon={ChartColumn} tile="blue" className="xl:col-span-2">
              <LeadsTrendChart
                days={report.byDay}
                height={310}
                ariaLabel={t("reports.chartTitle")}
                labels={{
                  delivered: t("reports.legendDelivered"),
                  failed: t("reports.legendFailed"),
                  waiting: t("reports.legendWaiting"),
                  total: t("reports.colTotal"),
                }}
              />
            </Card>

            <Card title={t("reports.sourceTitle")} icon={ChartPie} tile="purple">
              <SourceDonut
                legend={false}
                height={190}
                ariaLabel={t("reports.sourceTitle")}
                totalLabel={t("reports.colTotal")}
                items={report.bySource.map((row) => ({
                  key: row.source,
                  name: t(leadSourceKey(row.source)),
                  value: row.total,
                }))}
              />
              <ul className="mt-3 space-y-3">
                {report.bySource.map((row) => (
                  <li key={row.source}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-ink">
                        <i
                          className="size-2.5 shrink-0 rounded-[3px]"
                          style={{ background: SOURCE_COLORS[row.source] ?? "var(--chart-8)" }}
                        />
                        <span className="truncate">{t(leadSourceKey(row.source))}</span>
                      </span>
                      <span className="num shrink-0 text-ink-3">
                        {number(row.total)} · {percent(row.total, totals.total)}%
                      </span>
                    </div>
                    <Meter
                      value={percent(row.total, totals.total) / 100}
                      color={SOURCE_COLORS[row.source] ?? "var(--chart-8)"}
                      className="mt-1.5"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title={t("reports.formsTitle")} icon={FileInput} tile="teal" dense flush>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("reports.colForm")}</th>
                    <th>{t("reports.colCrm")}</th>
                    <th className="r">{t("reports.colTotal")}</th>
                    <th className="r">{t("reports.colDelivered")}</th>
                    <th className="r">{t("reports.colFailed")}</th>
                    <th>{t("reports.colRate")}</th>
                    <th>{t("reports.colLast")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byForm.map((row, index) => (
                    <tr key={index}>
                      <td>
                        {row.formLabel ?? t(leadSourceKey(row.source))}
                        <p className="text-xs text-ink-3">{t(leadSourceKey(row.source))}</p>
                      </td>
                      <td>{crmName(row.crmLabel, row.crmPlatform)}</td>
                      <td className="r font-semibold">{number(row.total)}</td>
                      <td className="r text-success">{number(row.success)}</td>
                      <td className="r text-danger">{row.failed > 0 ? number(row.failed) : "—"}</td>
                      <td>
                        <SuccessBar counts={row} />
                      </td>
                      <td className="text-ink-3">{formatDate(row.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={t("reports.crmTitle")} icon={Link2} tile="green" dense flush>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("reports.colCrm")}</th>
                    <th className="r">{t("reports.colTotal")}</th>
                    <th className="r">{t("reports.colDelivered")}</th>
                    <th className="r">{t("reports.colFailed")}</th>
                    <th className="r">{t("reports.colDuplicates")}</th>
                    <th>{t("reports.colRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCrm.map((row, index) => (
                    <tr key={index}>
                      <td>{crmName(row.label, row.platform)}</td>
                      <td className="r font-semibold">{number(row.total)}</td>
                      <td className="r text-success">{number(row.success)}</td>
                      <td className="r text-danger">{row.failed > 0 ? number(row.failed) : "—"}</td>
                      <td className="r">{row.duplicates > 0 ? number(row.duplicates) : "—"}</td>
                      <td>
                        <SuccessBar counts={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {report.byUtm.length > 0 && (
            <Card title={t("reports.utmTitle")} icon={Megaphone} tile="orange" dense flush>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>utm_source</th>
                      <th>utm_medium</th>
                      <th>utm_campaign</th>
                      <th className="r">{t("reports.colTotal")}</th>
                      <th className="r">{t("reports.colDelivered")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUtm.map((row, index) => (
                      <tr key={index}>
                        <td>{row.source ?? "—"}</td>
                        <td>{row.medium ?? "—"}</td>
                        <td>{row.campaign ?? "—"}</td>
                        <td className="r font-semibold">{number(row.total)}</td>
                        <td className="r text-success">{number(row.success)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {report.errors.length > 0 && (
            <Card title={t("reports.errorsTitle")} icon={TriangleAlert} tile="pink">
              <ul className="space-y-3">
                {report.errors.map((row, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="break-words font-mono text-danger/90">{translateMessage(row.message, locale)}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{t("reports.errorLast", { date: formatDate(row.last) })}</p>
                    </div>
                    <Badge tone="bad" className="shrink-0">
                      {number(row.total)}
                    </Badge>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/lead-tempo?status=failed"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                {t("reports.viewFailed")}
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
