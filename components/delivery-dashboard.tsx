import { Truck } from "lucide-react";
import { RoleComingSoon } from "@/components/role-coming-soon";

export function DeliveryDashboard() {
  return (
    <RoleComingSoon
      accent="#EA580C"
      description="The rider dashboard is not live yet. There are no deliveries, earnings or payouts at this time."
      eyebrow="Rider dashboard"
      icon={<Truck className="h-7 w-7" />}
      title="Coming soon"
    />
  );
}
