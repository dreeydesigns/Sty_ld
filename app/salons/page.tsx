import { redirect } from "next/navigation";

// Breadcrumbs and booking links point here — redirect to the Salons tab on Discover
export default function SalonsPage() {
  redirect("/discover?tab=salons");
}
