import { redirect } from "next/navigation";

export default function SalonDashboardPage() {
  redirect("/profile?tab=requests");
}
