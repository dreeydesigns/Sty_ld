import { ShoppingBag } from "lucide-react";
import { RoleComingSoon } from "@/components/role-coming-soon";

export function ShopDashboard() {
  return (
    <RoleComingSoon
      accent="#8B5CF6"
      description="The shop dashboard is not live yet. There are no listings, orders, earnings or payouts at this time."
      eyebrow="Shop dashboard"
      icon={<ShoppingBag className="h-7 w-7" />}
      title="Coming soon"
    />
  );
}
