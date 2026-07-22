const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Muvaffaqiyatli",
  FAILED: "Xato",
  PENDING: "Kutilmoqda",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
