export const marketplaceProtectionSteps = [
  {
    title: "Sign in",
    detail: "Every paid request is tied to a real client account.",
  },
  {
    title: "Pay to request",
    detail: "The client pays before the salon or professional receives the confirmed request.",
  },
  {
    title: "Funds held",
    detail: "Mobile Salon keeps the payment pending in the platform flow until the service is completed.",
  },
  {
    title: "Both confirm",
    detail: "Client and professional each confirm the appointment was completed.",
  },
  {
    title: "Payout released",
    detail: "The professional payout is released after completion, less platform fees.",
  },
] as const;

export const payoutStates = [
  {
    label: "Awaiting payment",
    copy: "Request is saved, but the provider cannot accept it until checkout is complete.",
    tone: "Soft lock",
  },
  {
    label: "Funded",
    copy: "Client has paid. Funds are held while the service is pending.",
    tone: "Protected",
  },
  {
    label: "In service",
    copy: "Appointment has started. Changes must go through the platform.",
    tone: "Active",
  },
  {
    label: "Mutual confirmation",
    copy: "Client confirms received. Professional confirms completed.",
    tone: "Release gate",
  },
  {
    label: "Released or disputed",
    copy: "Payout goes out, or support holds the funds while reviewing evidence.",
    tone: "Final",
  },
] as const;

export const platformRevenueRules = [
  "Mobile Salon is the marketplace bridge, not the service owner.",
  "Clients must sign in and pay before a request can be confirmed.",
  "Professional payouts are not released until completion is confirmed.",
  "Disputes pause payout release and route both sides to support.",
  "Platform fees, payment fees, refunds, and cancellation windows must be visible before checkout.",
] as const;

export const protectedPaymentArchitecture = [
  "Checkout creates a booking ledger before notifying the professional.",
  "Connected payout accounts must pass verification before release is possible.",
  "The platform records client confirmation, professional confirmation, edits, cancellations, and disputes.",
  "Provider contact details stay masked until a funded booking is confirmed.",
  "Production can use Stripe Connect destination charges or an M-Pesa-ready PSP flow with the same ledger states.",
] as const;

export const professionalQualityStandards = [
  "Clear face or brand image",
  "At least six portfolio photos",
  "Prices visible in KES",
  "Duration shown per service",
  "Areas served and travel mode clear",
  "Payout account connected",
] as const;

export const professionalRequests = [
  {
    client: "Mercy A.",
    service: "Knotless Braids",
    time: "Today, 2:30 PM",
    status: "Funded",
    value: "KES 5,800",
  },
  {
    client: "Wanjira K.",
    service: "Soft Glam",
    time: "Tomorrow, 9:00 AM",
    status: "Awaiting confirmation",
    value: "KES 4,500",
  },
  {
    client: "Lorna M.",
    service: "Low Cut Reset",
    time: "Sat, 11:15 AM",
    status: "In service",
    value: "KES 2,600",
  },
] as const;
