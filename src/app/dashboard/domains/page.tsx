import { Globe } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function DomainsPage() {
  return (
    <ComingSoon
      title="Domenlar"
      description="Landing page yoki CPA saytingiz uchun domen ro'yxatdan o'tkazish va DNS sozlamalari shu yerda bo'ladi."
      icon={Globe}
    />
  );
}
