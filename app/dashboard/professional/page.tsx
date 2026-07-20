import { redirect } from "next/navigation";

export default function ProfessionalDashboardPage() {
  redirect("/profile?tab=requests");
}
