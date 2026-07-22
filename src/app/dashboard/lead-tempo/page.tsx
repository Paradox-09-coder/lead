import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { RetryButton } from "@/components/RetryButton";
import type { SyncStatus } from "@/generated/prisma/enums";

const STATUS_FILTERS: Array<{ value: SyncStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Barchasi" },
  { value: "SUCCESS", label: "Muvaffaqiyatli" },
  { value: "FAILED", label: "Xato" },
  { value: "PENDING", label: "Kutilmoqda" },
];

export default async function LeadTempoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = status && status !== "ALL" ? (status as SyncStatus) : undefined;

  const leads = await prisma.syncedLead.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lid tempi</h1>
          <p className="mt-1 text-sm text-muted">Facebook&apos;dan Bitrix24&apos;ga sinxronlangan lidlar</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === "ALL" ? "/dashboard/lead-tempo" : `/dashboard/lead-tempo?status=${filter.value}`}
            className={`text-sm rounded-md px-3 py-1.5 border transition-colors ${
              (status ?? "ALL") === filter.value
                ? "border-primary bg-primary text-white"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 text-muted">Hozircha lid topilmadi.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted">
                <th className="py-2 px-4 font-medium">Sana</th>
                <th className="py-2 px-4 font-medium">Facebook Leadgen ID</th>
                <th className="py-2 px-4 font-medium">Holat</th>
                <th className="py-2 px-4 font-medium">Bitrix Lead ID</th>
                <th className="py-2 px-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="py-3 px-4 whitespace-nowrap text-muted">
                    {lead.createdAt.toLocaleString("uz-UZ")}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    <Link href={`/dashboard/lead-tempo/${lead.id}`} className="hover:underline">
                      {lead.fbLeadgenId}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="py-3 px-4">{lead.bitrixLeadId ?? "—"}</td>
                  <td className="py-3 px-4 text-right">
                    {lead.status === "FAILED" && <RetryButton leadId={lead.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
