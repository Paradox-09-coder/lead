import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";
import { getT } from "@/i18n/server";

export default async function ReportsPage() {
  const { t } = await getT();
  return (
    <ComingSoon
      title={t("comingSoon.reportsTitle")}
      description={t("comingSoon.reportsDesc")}
      icon={FileText}
    />
  );
}
