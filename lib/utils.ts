import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKES(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPriceRange(min: number, max?: number) {
  if (!max || min === max) {
    return formatKES(min);
  }

  return `${formatKES(min)} - ${formatKES(max)}`;
}

export function formatDurationRange(min: number, max?: number) {
  if (!max || min === max) {
    return formatMinutes(min);
  }

  return `${formatMinutes(min)} - ${formatMinutes(max)}`;
}

function formatMinutes(value: number) {
  if (value >= 60) {
    const hours = value / 60;

    if (Number.isInteger(hours)) {
      return `${hours} hr`;
    }

    return `${hours.toFixed(1)} hrs`;
  }

  return `${value} min`;
}

export function formatCompactCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function buildWhatsAppLink(label: string) {
  const text = encodeURIComponent(
    `Hi Mobile Salon, I would like support with ${label.toLowerCase()}.`,
  );

  return `https://wa.me/254700123456?text=${text}`;
}

export function buildBookingHref(input: {
  targetType: "salons" | "professionals";
  targetId?: string;
  serviceIds?: string[];
}) {
  const params = new URLSearchParams();
  params.set("targetType", input.targetType);

  if (input.targetId) {
    params.set("targetId", input.targetId);
  }

  if (input.serviceIds?.length) {
    params.set("serviceIds", input.serviceIds.join(","));
  }

  return `/book?${params.toString()}`;
}

export function toSentenceCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
