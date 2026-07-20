import { redirect } from "next/navigation";

// Breadcrumbs and booking links point here — redirect to the Professionals tab on Discover
export default function ProfessionalsPage() {
  redirect("/discover?tab=professionals");
}
