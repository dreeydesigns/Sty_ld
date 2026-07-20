import type { Metadata } from "next";
import { DeliveryDashboard } from "@/components/delivery-dashboard";

export const metadata: Metadata = {
  title: "Delivery Dashboard",
  description: "Manage your deliveries, earnings, and availability as a Mobile Salon delivery partner.",
};

export default function DeliveryDashboardPage() {
  return <DeliveryDashboard />;
}
