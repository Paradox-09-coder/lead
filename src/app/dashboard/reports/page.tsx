import Link from "next/link";
import { CheckCircle2, Copy, Hourglass, Inbox, XCircle } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import { getT } from "@/i18n/server";
import { translateMessage } from "@/i18n/messages";
import { StatTile } from "@/components/dashboard/StatTile";
import { leadSourceKey } from "@/lib/public-lead";
import {
  REPORT_PERIODS,
  REPORT_TIMEZONE,
  getLeadReport,
  type Counts,
  type DayPoint,
  type ReportPeriod,
} from "@/lib/reports";

const PLATFORM_NAMES: Record<string, string> = { bitrix24: "Bitrix24", amocrm: "amoCRM / Kommo" };

const PERIOD_LABEL_KEYS: Record<ReportPeriod, string> = {
  "1": "reports.periodToday",
  "7": "reports.period7",
  "30": "reports.period30",
  "90": "reports.period90",
  all: "reports.periodAll",
};

const SOURCE_COLORS: Record<string, string> = {
  facebook: "bg-[#1877F2]",
  form: "bg-accent",
  api: "bg-warning",
};

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SuccessBar({ counts }: { counts: Counts }) {
  const rate = percent(counts.success, counts.total);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-hover">
        <div className="h-full bg-success" style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-muted">{rate}%</span>
    </div>
  );
}

function DailyChart({ days, tooltip }: { days: DayPoint[]; tooltip: (day: DayPoint) => string }) {
  const max = Math.max(1, ...days.map((d) => d.total));
  const middle = days[Math.floor(days.length / 2)];
  return (
    <div>
      <div className="flex h-40 items-end gap-px">
        {days.map((day) => {
          const other = day.total - day.success - day.failed;
          return (
            <div key={day.date} title={tooltip(day)} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              {day.total > 0 && (
                <div className="flex w-full flex-col overflow-hidden rounded-t-sm" style={{ height: `${(day.total / max) * 100}%` }}>
                  {other > 0 && <div className="bg-primary" style={{ flex: other }} />}
                  {day.failed > 0 && <div className="bg-danger" style={{ flex: day.failed }} />}
                  {day.success > 0 && <div className="bg-success" style={{ flex: day.success }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{days[0]?.date}</span>
        {days.length > 6 && <span>{middle?.date}</span>}
        <span>{days[days.length - 1]?.date}</span>
      </div>
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
      <div>
        <h1 className="text-2xl font-semibold">{t("reports.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("reports.subtitle")}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_PERIODS.map((value) => (
          <Link
            key={value}
            href={value === "30" ? "/dashboard/reports" : `/dashboard/reports?period=${value}`}
            className={`text-sm rounded-md px-3 py-1.5 border transition-colors ${
              period === value ? "border-primary bg-primary text-white" : "border-border hover:bg-surface-hover"
            }`}
          >
            {t(PERIOD_LABEL_KEYS[value])}
          </Link>
        ))}
      </div>

      {!report || !totals || totals.total === 0 ? (
        <p className="mt-8 text-muted">{t("reports.empty")}</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={Inbox} label={t("reports.statTotal")} value={number(totals.total)} />
            <StatTile
              icon={CheckCircle2}
              label={t("reports.statDelivered")}
              value={number(totals.success)}
              trend={t("reports.statRate", { percent: percent(totals.success, totals.total) })}
            />
            <StatTile icon={XCircle} label={t("reports.statFailed")} value={number(totals.failed)} />
            <StatTile icon={Hourglass} label={t("reports.statWaiting")} value={number(waiting)} />
          </div>
          {totals.duplicates > 0 && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Copy className="size-4" />
              {t("reports.duplicatesNote", { count: number(totals.duplicates) })}
            </p>
          )}

          <Section title={t("reports.chartTitle")}>
            <DailyChart
              days={report.byDay}
              tooltip={(day) =>
                t("reports.chartTooltip", {
                  date: day.date,
                  total: day.total,
                  success: day.success,
                  failed: day.failed,
                })
              }
            />
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-success" />{t("reports.legendDelivered")}</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-danger" />{t("reports.legendFailed")}</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-primary" />{t("reports.legendWaiting")}</span>
            </div>
          </Section>

          <Section title={t("reports.sourceTitle")}>
            <div className="space-y-3">
              {report.bySource.map((row) => (
                <div key={row.source}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{t(leadSourceKey(row.source))}</span>
                    <span className="text-muted">
                      {number(row.total)} · {percent(row.total, totals.total)}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-hover">
                    <div
                      className={`h-full ${SOURCE_COLORS[row.source] ?? "bg-primary"}`}
                      style={{ width: `${percent(row.total, totals.total)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title={t("reports.formsTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-4 font-medium">{t("reports.colForm")}</th>
                    <th className="py-2 pr-4 font-medium">{t("reports.colCrm")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colTotal")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colDelivered")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colFailed")}</th>
                    <th className="py-2 pr-4 font-medium">{t("reports.colRate")}</th>
                    <th className="py-2 font-medium">{t("reports.colLast")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byForm.map((row, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        {row.formLabel ?? t(leadSourceKey(row.source))}
                        <p className="text-xs text-muted">{t(leadSourceKey(row.source))}</p>
                      </td>
                      <td className="py-3 pr-4">{crmName(row.crmLabel, row.crmPlatform)}</td>
                      <td className="py-3 pr-4 text-right font-medium">{number(row.total)}</td>
                      <td className="py-3 pr-4 text-right text-success">{number(row.success)}</td>
                      <td className="py-3 pr-4 text-right text-danger">{row.failed > 0 ? number(row.failed) : "—"}</td>
                      <td className="py-3 pr-4"><SuccessBar counts={row} /></td>
                      <td className="py-3 whitespace-nowrap text-muted">{formatDate(row.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={t("reports.crmTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-4 font-medium">{t("reports.colCrm")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colTotal")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colDelivered")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colFailed")}</th>
                    <th className="py-2 pr-4 text-right font-medium">{t("reports.colDuplicates")}</th>
                    <th className="py-2 font-medium">{t("reports.colRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCrm.map((row, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">{crmName(row.label, row.platform)}</td>
                      <td className="py-3 pr-4 text-right font-medium">{number(row.total)}</td>
                      <td className="py-3 pr-4 text-right text-success">{number(row.success)}</td>
                      <td className="py-3 pr-4 text-right text-danger">{row.failed > 0 ? number(row.failed) : "—"}</td>
                      <td className="py-3 pr-4 text-right">{row.duplicates > 0 ? number(row.duplicates) : "—"}</td>
                      <td className="py-3"><SuccessBar counts={row} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {report.byUtm.length > 0 && (
            <Section title={t("reports.utmTitle")}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-2 pr-4 font-medium">utm_source</th>
                      <th className="py-2 pr-4 font-medium">utm_medium</th>
                      <th className="py-2 pr-4 font-medium">utm_campaign</th>
                      <th className="py-2 pr-4 text-right font-medium">{t("reports.colTotal")}</th>
                      <th className="py-2 text-right font-medium">{t("reports.colDelivered")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byUtm.map((row, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">{row.source ?? "—"}</td>
                        <td className="py-3 pr-4">{row.medium ?? "—"}</td>
                        <td className="py-3 pr-4">{row.campaign ?? "—"}</td>
                        <td className="py-3 pr-4 text-right font-medium">{number(row.total)}</td>
                        <td className="py-3 text-right text-success">{number(row.success)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {report.errors.length > 0 && (
            <Section title={t("reports.errorsTitle")}>
              <ul className="space-y-3">
                {report.errors.map((row, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="break-words font-mono text-danger/90">{translateMessage(row.message, locale)}</p>
                      <p className="mt-0.5 text-xs text-muted">{t("reports.errorLast", { date: formatDate(row.last) })}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">
                      {number(row.total)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/lead-tempo?status=failed" className="mt-4 inline-block text-sm text-primary hover:underline">
                {t("reports.viewFailed")}
              </Link>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
