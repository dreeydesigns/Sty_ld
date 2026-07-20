import { redirect } from "next/navigation";

/**
 * /pro/dashboard → /profile?tab=requests
 * Old legacy route kept so existing links don't 404.
 */
export default function ProDashboardPage() {
  redirect("/profile?tab=requests");
}
