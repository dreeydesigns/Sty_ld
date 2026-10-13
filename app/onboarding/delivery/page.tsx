import type { Metadata } from "next";
import { DeliveryOnboardingFlow } from "@/components/delivery-onboarding-flow";

export const metadata: Metadata = {
  title: "Delivery partners coming soon",
  description:
    "Delivery partner accounts on Styld are not open yet. Applications are coming soon.",
};

export default function DeliveryOnboardingPage() {
  return <DeliveryOnboardingFlow />;
}
