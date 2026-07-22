import { KeyRound } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function ApiKeysPage() {
  return (
    <ComingSoon
      title="API Kalitlar"
      description="O'zingizning integratsiyalaringiz uchun API kalitlarini shu yerda yaratasiz va boshqarasiz."
      icon={KeyRound}
    />
  );
}
