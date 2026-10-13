import { ShoppingBag } from "lucide-react";
import { RoleComingSoon } from "@/components/role-coming-soon";

export function ShopOnboardingFlow() {
  return (
    <RoleComingSoon
      accent="#8B5CF6"
      description="Shop applications are not open yet. We are not collecting business, tax or payout details at this time."
      eyebrow="Shop accounts"
      icon={<ShoppingBag className="h-7 w-7" />}
      title="Coming soon"
    />
  );
}
