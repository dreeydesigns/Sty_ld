import type { Metadata } from "next";
import { DeliveryOnboardingFlow } from "@/components/delivery-onboarding-flow";

export const metadata: Metadata = {
  title: "Register as a Delivery Partner",
  description:
    "Join Mobile Salon's delivery network. Deliver beauty products from Shop+ sellers across Nairobi.",
};

export default function DeliveryOnboardingPage() {
  return <DeliveryOnboardingFlow />;
}
