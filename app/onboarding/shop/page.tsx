import type { Metadata } from "next";
import { ShopOnboardingFlow } from "@/components/shop-onboarding-flow";

export const metadata: Metadata = {
  title: "Shop accounts coming soon",
  description:
    "Shop accounts on Styld are not open yet. Applications are coming soon.",
};

export default function ShopOnboardingPage() {
  return <ShopOnboardingFlow />;
}
