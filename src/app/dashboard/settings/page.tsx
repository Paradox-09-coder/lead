import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Sozlamalar"
      description="Profil, bildirishnoma va akkaunt sozlamalarini shu yerdan boshqarasiz."
      icon={Settings}
    />
  );
}
