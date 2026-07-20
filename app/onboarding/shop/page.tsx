import type { Metadata } from "next";
import { ShopOnboardingFlow } from "@/components/shop-onboarding-flow";

export const metadata: Metadata = {
  title: "Register a Shop — Sell on Counter",
  description:
    "Create your Mobile Salon Shop account to list and sell beauty products on Counter. Verified sellers only.",
};

export default function ShopOnboardingPage() {
  return <ShopOnboardingFlow />;
}
