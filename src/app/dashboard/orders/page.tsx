import { ShoppingCart } from "lucide-react";
import { ComingSoon } from "@/components/dashboard/ComingSoon";

export default function OrdersPage() {
  return (
    <ComingSoon
      title="Buyurtmalar"
      description="Tarif va qo'shimcha xizmatlar bo'yicha buyurtmalar tarixi shu yerda ko'rinadi."
      icon={ShoppingCart}
    />
  );
}
