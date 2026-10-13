import { Truck } from "lucide-react";
import { RoleComingSoon } from "@/components/role-coming-soon";

export function DeliveryOnboardingFlow() {
  return (
    <RoleComingSoon
      accent="#EA580C"
      description="Delivery applications are not open yet. We are not collecting ID, licence or payout details at this time."
      eyebrow="Delivery partners"
      icon={<Truck className="h-7 w-7" />}
      title="Coming soon"
    />
  );
}
