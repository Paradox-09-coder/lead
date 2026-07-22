import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { RetryButton } from "@/components/RetryButton";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.syncedLead.findUnique({ where: { id } });
  if (!lead) notFound();

  return (
    <div>
      <Link href="/dashboard/lead-tempo" className="text-sm text-muted hover:underline">
        ← Ro&apos;yxatga qaytish
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lid tafsilotlari</h1>
          <p className="mt-1 text-sm text-muted font-mono">{lead.fbLeadgenId}</p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted">Yaratilgan sana</dt>
          <dd className="mt-1">{lead.createdAt.toLocaleString("uz-UZ")}</dd>
        </div>
        <div>
          <dt className="text-muted">Yangilangan sana</dt>
          <dd className="mt-1">{lead.updatedAt.toLocaleString("uz-UZ")}</dd>
        </div>
        <div>
          <dt className="text-muted">Facebook Page ID</dt>
          <dd className="mt-1 font-mono">{lead.pageId}</dd>
        </div>
        <div>
          <dt className="text-muted">Facebook Form ID</dt>
          <dd className="mt-1 font-mono">{lead.formId}</dd>
        </div>
        <div>
          <dt className="text-muted">Bitrix24 Lead ID</dt>
          <dd className="mt-1">{lead.bitrixLeadId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Qayta urinishlar soni</dt>
          <dd className="mt-1">{lead.retryCount}</dd>
        </div>
      </dl>

      {lead.errorMessage && (
        <div className="mt-6 rounded-md border border-danger/30 bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">Xato matni</p>
          <p className="mt-1 text-sm text-danger/90 font-mono whitespace-pre-wrap">{lead.errorMessage}</p>
        </div>
      )}

      {lead.status === "FAILED" && (
        <div className="mt-6">
          <RetryButton leadId={lead.id} />
        </div>
      )}

      {lead.rawFieldData != null && (
        <div className="mt-8">
          <h2 className="font-semibold">Facebook&apos;dan kelgan xom ma&apos;lumot</h2>
          <pre className="mt-2 rounded-md bg-surface border border-border p-4 text-xs overflow-x-auto">
            {JSON.stringify(lead.rawFieldData, null, 2)}
          </pre>
        </div>
      )}

      {lead.mappedFields != null && (
        <div className="mt-6">
          <h2 className="font-semibold">Bitrix24&apos;ga yuborilgan maydonlar</h2>
          <pre className="mt-2 rounded-md bg-surface border border-border p-4 text-xs overflow-x-auto">
            {JSON.stringify(lead.mappedFields, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
