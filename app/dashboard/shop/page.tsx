import type { Metadata } from "next";
import { ShopDashboard } from "@/components/shop-dashboard";

export const metadata: Metadata = {
  title: "Shop dashboard coming soon",
  description: "The Styld shop dashboard is not live yet.",
};

export default function ShopDashboardPage() {
  return <ShopDashboard />;
}
