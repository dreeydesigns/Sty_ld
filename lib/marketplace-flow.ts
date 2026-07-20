export type BookingPaymentStatus =
  | "draft"
  | "awaiting_auth"
  | "checkout_required"
  | "funded"
  | "in_service"
  | "client_confirmed"
  | "professional_confirmed"
  | "released"
  | "disputed"
  | "refunded";

export interface MarketplaceBookingLedger {
  id: string;
  clientId: string;
  salonId?: string;
  professionalId?: string;
  amountKes: number;
  platformFeeKes: number;
  providerPayoutKes: number;
  status: BookingPaymentStatus;
  clientConfirmedAt?: string;
  professionalConfirmedAt?: string;
  disputeOpenedAt?: string;
}

export const marketplaceFlowCheckpoints = [
  "Client signs in before request completion",
  "Checkout creates a funded booking record",
  "Provider sees service details only after payment succeeds",
  "Funds stay pending while the appointment is active",
  "Client and provider both confirm completion",
  "Platform releases payout or pauses funds for dispute review",
] as const;

export function canReleaseProviderPayout(ledger: MarketplaceBookingLedger) {
  return Boolean(
    ledger.status !== "disputed" &&
      ledger.status !== "refunded" &&
      ledger.clientConfirmedAt &&
      ledger.professionalConfirmedAt,
  );
}

export function nextMarketplaceCheckpoint(status: BookingPaymentStatus) {
  switch (status) {
    case "draft":
      return "Save the selected service and prompt account sign-in.";
    case "awaiting_auth":
      return "Restore the saved booking after sign-in or sign-up.";
    case "checkout_required":
      return "Open protected checkout before provider confirmation.";
    case "funded":
      return "Notify the provider with funded request details.";
    case "in_service":
      return "Keep edits inside the platform and prepare confirmation.";
    case "client_confirmed":
      return "Wait for professional completion confirmation.";
    case "professional_confirmed":
      return "Wait for client received-service confirmation.";
    case "released":
      return "Mark payout released and close the booking.";
    case "disputed":
      return "Pause payout and collect evidence from both sides.";
    case "refunded":
      return "Close the request and keep audit history.";
  }
}
