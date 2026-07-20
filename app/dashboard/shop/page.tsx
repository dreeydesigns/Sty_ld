import type { Metadata } from "next";
import { ShopDashboard } from "@/components/shop-dashboard";

export const metadata: Metadata = {
  title: "My Shop — Seller Dashboard",
  description: "Manage your Counter listings, orders, earnings, and shop settings.",
};

export default function ShopDashboardPage() {
  return <ShopDashboard />;
}
