import Link from "next/link";
import { Circle, ChevronRight } from "lucide-react";

const CHECKLIST_ITEMS = [
  { href: "/dashboard/connections", label: "Facebook yoki Google hisobini ulash" },
  { href: "/dashboard/integrations", label: "Birinchi integratsiyani qo'shish" },
];

export function ChecklistCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="font-semibold">Boshlashga tayyormisiz?</h2>
      <p className="mt-1 text-sm text-muted">Birinchi lidlaringizni qabul qilish uchun 2 ta qadam qoldi</p>

      <div className="mt-4 space-y-2">
        {CHECKLIST_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 hover:bg-surface-hover transition-colors"
          >
            <span className="flex items-center gap-2.5 text-sm">
              <Circle className="size-4 text-muted" />
              {item.label}
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
