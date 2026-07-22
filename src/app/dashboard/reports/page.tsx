import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Hisobotlar"
      description="Reklama xarajatlari, lidlar va konversiya statistikasi shu yerda ko'rinadi."
      icon={FileText}
    />
  );
}
