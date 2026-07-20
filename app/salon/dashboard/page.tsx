import { redirect } from "next/navigation";

/**
 * /salon/dashboard → /profile?tab=requests
 * Old legacy route kept so existing links don't 404.
 */
export default function SalonDashboardPage() {
  redirect("/profile?tab=requests");
}
