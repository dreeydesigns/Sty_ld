import type { Metadata } from "next";
import { DeliveryDashboard } from "@/components/delivery-dashboard";

export const metadata: Metadata = {
  title: "Delivery dashboard coming soon",
  description: "The Styld delivery dashboard is not live yet.",
};

export default function DeliveryDashboardPage() {
  return <DeliveryDashboard />;
}
