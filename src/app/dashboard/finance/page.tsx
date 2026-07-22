import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function FinancePage() {
  return (
    <ComingSoon
      title="Moliya tahlili"
      description="Tarif to'lovlari, balans va xarajatlar tahlili shu yerda ko'rinadi."
      icon={Wallet}
    />
  );
}
