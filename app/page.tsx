import type { Metadata } from "next";
import LandingClient from "@/components/landing-client";

export const metadata: Metadata = {
  title: "Styld | Kenya's Trusted Beauty Platform",
  description:
    "Styld is Kenya's trusted digital beauty marketplace for clients, salons, and independent professionals.",
  openGraph: {
    title: "Styld | Trusted beauty access",
    description:
      "Discover trusted beauty help, list your salon, or grow as an independent professional.",
    type: "website",
  },
};

export default function PublicLandingPage() {
  return <LandingClient />;
}
