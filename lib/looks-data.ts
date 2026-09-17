/**
 * STYLD "The Look" Data Model & Canonical Repository
 *
 * Implements the core product thesis:
 * In beauty, clients often discover visually before articulating intent.
 * "The Look" is the primary commercial object that connects visual inspiration
 * to a verified provider, transparent KES price, duration, and instant booking.
 */

import { imageAssets, type VisualAsset } from "./site-data";

export type LookCategory =
  | "All"
  | "Protective Styles & Braids"
  | "Natural Hair & Curls"
  | "Locs & Sisterlocks"
  | "Nails & Nail Art"
  | "Soft Glam & Makeup"
  | "Silk Press & Styling"
  | "Cuts & Fades"
  | "Lashes & Brows";

export type LookProvenance = "completed_appointment" | "verified_portfolio";

export interface BeautyLook {
  id: string;
  title: string;
  category: LookCategory;
  hairType?: string;
  image: VisualAsset;
  providerSlug: string;
  providerName: string;
  providerType: "professionals" | "salons";
  location: string;
  serviceId: string;
  serviceName: string;
  startingPrice: number; // KES
  estimatedDuration: string;
  serviceMode: "In salon" | "Mobile" | "Both";
  provenance: LookProvenance;
  verifiedClientReviewsCount: number;
  rating: number;
  nextAvailable: string;
  tags: string[];
}

export const BEAUTY_LOOKS: BeautyLook[] = [
  {
    id: "boho-knotless",
    title: "Medium Boho Knotless Braids",
    category: "Protective Styles & Braids",
    hairType: "4C / Textured",
    image: imageAssets.braidsPortrait,
    providerSlug: "njeri-kamau",
    providerName: "Njeri Kamau",
    providerType: "professionals",
    location: "Kilimani",
    serviceId: "knotless-braids",
    serviceName: "Knotless Braids",
    startingPrice: 4500,
    estimatedDuration: "3.5 - 4 hrs",
    serviceMode: "Both",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 132,
    rating: 4.9,
    nextAvailable: "This Saturday, 10:00 AM",
    tags: ["Boho", "Knotless", "Waist Length", "Low Tension"],
  },
  {
    id: "sisterlocks-retighten",
    title: "Sisterlocks Clean Retightening & Style",
    category: "Locs & Sisterlocks",
    hairType: "Microlocs / Sisterlocks",
    image: imageAssets.salonBraiding,
    providerSlug: "njeri-kamau",
    providerName: "Njeri Kamau",
    providerType: "professionals",
    location: "Kilimani",
    serviceId: "natural-hair-styling",
    serviceName: "Natural Hair Styling",
    startingPrice: 3500,
    estimatedDuration: "2.5 hrs",
    serviceMode: "Both",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 98,
    rating: 4.9,
    nextAvailable: "Friday, 2:00 PM",
    tags: ["Sisterlocks", "Microlocs", "Grid Care", "Hydration"],
  },
  {
    id: "bridal-soft-glam",
    title: "Nairobi Nude Bridal Soft Glam",
    category: "Soft Glam & Makeup",
    hairType: "All Melanin Tones",
    image: imageAssets.makeupArtist,
    providerSlug: "faith-odhiambo",
    providerName: "Faith Odhiambo",
    providerType: "professionals",
    location: "Karen",
    serviceId: "bridal-glam",
    serviceName: "Bridal Glam",
    startingPrice: 7500,
    estimatedDuration: "1.5 hrs",
    serviceMode: "Mobile",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 88,
    rating: 4.9,
    nextAvailable: "Saturday, 8:00 AM",
    tags: ["Bridal", "Soft Glam", "Melanin Match", "Waterproof"],
  },
  {
    id: "chrome-almond-nails",
    title: "Minimalist Chrome Almond Gel Set",
    category: "Nails & Nail Art",
    hairType: "Hands & Nails",
    image: imageAssets.nails,
    providerSlug: "amina-mwangi",
    providerName: "Amina Mwangi",
    providerType: "professionals",
    location: "Westlands",
    serviceId: "gel-manicure",
    serviceName: "Gel Manicure",
    startingPrice: 2800,
    estimatedDuration: "1 hr 15 mins",
    serviceMode: "In salon",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 109,
    rating: 4.8,
    nextAvailable: "Tomorrow, 11:30 AM",
    tags: ["Chrome", "Almond", "Clean Girl", "Cuticle Prep"],
  },
  {
    id: "botanical-silk-press",
    title: "High-Gloss Botanical Silk Press",
    category: "Silk Press & Styling",
    hairType: "4A-4C Natural",
    image: imageAssets.naturalHair,
    providerSlug: "njeri-kamau",
    providerName: "Njeri Kamau",
    providerType: "professionals",
    location: "Kilimani",
    serviceId: "silk-press",
    serviceName: "Silk Press",
    startingPrice: 3200,
    estimatedDuration: "2 hrs",
    serviceMode: "Both",
    provenance: "verified_portfolio",
    verifiedClientReviewsCount: 76,
    rating: 4.9,
    nextAvailable: "Thursday, 3:30 PM",
    tags: ["Heat Protect", "Silk Press", "Body & Bounce", "Trim"],
  },
  {
    id: "precision-taper-fade",
    title: "Precision Low Taper & Side Fade",
    category: "Cuts & Fades",
    hairType: "Short Natural",
    image: imageAssets.beardCare,
    providerSlug: "kevin-ochieng",
    providerName: "Wanjiku Ochieng",
    providerType: "professionals",
    location: "South B",
    serviceId: "mens-fade",
    serviceName: "Precision Fade",
    startingPrice: 1500,
    estimatedDuration: "45 mins",
    serviceMode: "Both",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 73,
    rating: 4.7,
    nextAvailable: "Today, 4:30 PM",
    tags: ["Low Cut", "Precision Lineup", "Feminine Fade", "Express"],
  },
  {
    id: "natural-lash-extensions",
    title: "Featherlight Natural Lash Extensions",
    category: "Lashes & Brows",
    hairType: "Eyes & Brows",
    image: imageAssets.lashesTools,
    providerSlug: "amina-mwangi",
    providerName: "Amina Mwangi",
    providerType: "professionals",
    location: "Westlands",
    serviceId: "lash-classic",
    serviceName: "Classic Lash Set",
    startingPrice: 3800,
    estimatedDuration: "1 hr 45 mins",
    serviceMode: "In salon",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 64,
    rating: 4.8,
    nextAvailable: "Friday, 10:00 AM",
    tags: ["Classic Set", "Natural Flutter", "Zero Clump", "Lightweight"],
  },
  {
    id: "fulani-tribal-braids",
    title: "Cowrie & Bead Fulani Tribal Braids",
    category: "Protective Styles & Braids",
    hairType: "4C / Textured",
    image: imageAssets.braidsPortrait,
    providerSlug: "njeri-kamau",
    providerName: "Njeri Kamau",
    providerType: "professionals",
    location: "Kilimani",
    serviceId: "fulani-braids",
    serviceName: "Fulani Tribal Braids",
    startingPrice: 5000,
    estimatedDuration: "4.5 hrs",
    serviceMode: "Both",
    provenance: "completed_appointment",
    verifiedClientReviewsCount: 112,
    rating: 4.9,
    nextAvailable: "Monday, 9:00 AM",
    tags: ["Fulani", "Traditional Accents", "Cowrie Beads", "Crisp Parts"],
  },
];
