import type { ThemeKey } from "@/lib/personalization";

export type RoleMode = "salons" | "professionals";
export type NavKey =
  | "home"
  | "discover"
  | "explore"
  | "counter"
  | "book"
  | "activity"
  | "profile"
  | "salons"
  | "professionals"
  | "requests"
  | "messages"
  | "posts"
  | "guide"
  | "admin";

export type ServiceCategory =
  | "Hair"
  | "Care / Skin"
  | "Nails"
  | "Make-Up"
  | "Lashes / Brows"
  | "Short Hair & Shave"
  | "Self-Care / Beauty"
  | "Bridal & Events";

export type ServiceMode = "In salon" | "Mobile" | "Both";

export interface VisualAsset {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
  position?: string;
}

export const imageAssets = {
  braidsPortrait: {
    url: "https://images.pexels.com/photos/11515382/pexels-photo-11515382.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Black woman with golden braids against a warm yellow background",
    credit: "Pexels / Kehinde Ogunsanya",
    creditUrl: "https://www.pexels.com/photo/portrait-of-a-woman-with-braids-11515382/",
    position: "center 28%",
  },
  salonBraiding: {
    url: "https://images.pexels.com/photos/16192981/pexels-photo-16192981.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    alt: "Stylist braiding natural Black hair in a salon setting",
    credit: "Pexels / Planetelevene",
    creditUrl: "https://www.pexels.com/photo/african-hair-braiding-in-salon-setting-16192981/",
    position: "center 45%",
  },
  naturalHair: {
    url: "https://images.pexels.com/photos/3228847/pexels-photo-3228847.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Black woman with long braids and natural hair texture outdoors",
    credit: "Pexels / fauxels",
    creditUrl: "https://www.pexels.com/photo/woman-standing-near-green-leaf-3228847/",
    position: "center 24%",
  },
  makeupArtist: {
    url: "https://images.pexels.com/photos/11360229/pexels-photo-11360229.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    alt: "Makeup artist applying eyeshadow on a Black woman",
    credit: "Pexels / Wayne Fotografias",
    creditUrl: "https://www.pexels.com/photo/a-woman-getting-make-up-by-a-make-up-artist-11360229/",
    position: "center 42%",
  },
  nails: {
    url: "https://images.unsplash.com/photo-1633955726992-2b7c0d2d2a69?auto=format&fit=crop&w=1200&q=85",
    alt: "Dark-skinned hands with white manicure on a burgundy background",
    credit: "Unsplash / Alazar Kassahun",
    creditUrl: "https://unsplash.com/photos/GV9_jUGReBo",
    position: "center 42%",
  },
  barber: {
    url: "https://images.pexels.com/photos/20718222/pexels-photo-20718222.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Black woman with short hair and soft beauty styling",
    credit: "Pexels",
    creditUrl: "https://www.pexels.com/photo/portrait-of-woman-with-short-black-hair-20718222/",
    position: "center 35%",
  },
  beardCare: {
    url: "https://images.pexels.com/photos/20718222/pexels-photo-20718222.jpeg?auto=compress&cs=tinysrgb&w=1400&h=900&fit=crop",
    alt: "Portrait of a Black woman with a short feminine cut",
    credit: "Pexels",
    creditUrl: "https://www.pexels.com/photo/portrait-of-woman-with-short-black-hair-20718222/",
    position: "center 38%",
  },
  lashesTools: {
    url: "https://images.pexels.com/photos/5128230/pexels-photo-5128230.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Lash extension tools held by a beauty professional",
    credit: "Pexels / Nataliya Vaitkevich",
    creditUrl: "https://www.pexels.com/photo/a-person-using-a-tweezer-on-eyelash-extensions-5128230/",
    position: "center 44%",
  },
  skincareHands: {
    url: "https://images.pexels.com/photos/7281296/pexels-photo-7281296.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Hands with black nails applying skincare product",
    credit: "Pexels / Karolina Grabowska",
    creditUrl: "https://www.pexels.com/photo/woman-with-black-nails-holding-bottle-above-palm-7281296/",
    position: "center 42%",
  },
  spaCare: {
    url: "https://images.pexels.com/photos/6620860/pexels-photo-6620860.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1500&fit=crop",
    alt: "Woman receiving a calm spa facial treatment",
    credit: "Pexels / Sora Shimazaki",
    creditUrl: "https://www.pexels.com/photo/woman-in-white-tank-top-lying-on-bed-6620860/",
    position: "center 42%",
  },
} satisfies Record<string, VisualAsset>;

export interface Service {
  id: string;
  category: ServiceCategory;
  name: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  durationMin: number;
  durationMax: number;
  inclusions: string;
  popular?: boolean;
  trending?: boolean;
  themeTag?: ThemeKey;
  image?: VisualAsset;
}

export interface PackageOffer {
  id: string;
  name: string;
  description: string;
  price: number;
  serviceIds: string[];
  badge: string;
  includedServices?: string[];
  bestFor?: string;
  ownerName?: string;
  trending?: boolean;
  themeTag?: ThemeKey;
}

export interface ReviewSnapshot {
  id: string;
  name: string;
  title: string;
  rating: number;
  body: string;
  serviceLabel: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  note: string;
  tint: string;
  themeTag?: ThemeKey;
  image?: VisualAsset;
}

export interface Salon {
  slug: string;
  name: string;
  tagline: string;
  location: string;
  areasServed: string[];
  rating: number;
  reviewCount: number;
  startingPrice: number;
  categoryTags: string[];
  verified: boolean;
  mobileService: boolean;
  about: string;
  description: string;
  heroMood: string;
  image?: VisualAsset;
  serviceIds: string[];
  topServiceIds: string[];
  packageOffers: PackageOffer[];
  gallery: PortfolioItem[];
  faq: { question: string; answer: string }[];
  professionals: string[];
  nextAvailable: string;
  responseSpeedMinutes: number;
  completionRate: number;
  repeatBookings: number;
  savedCount: number;
  trendingScore: number;
  themeAffinity?: ThemeKey[];
  tribeBadges?: ThemeKey[];
}

export interface Professional {
  slug: string;
  name: string;
  specialty: string;
  location: string;
  serviceMode: ServiceMode;
  salonAffiliation: string;
  areasServed: string[];
  rating: number;
  reviewCount: number;
  startingPrice: number;
  verified: boolean;
  bio: string;
  description: string;
  heroMood: string;
  image?: VisualAsset;
  serviceIds: string[];
  packageOffers: PackageOffer[];
  gallery: PortfolioItem[];
  faq: { question: string; answer: string }[];
  nextAvailable: string;
  responseSpeedMinutes: number;
  completionRate: number;
  repeatBookings: number;
  savedCount: number;
  trendingScore: number;
  identityAttributes: string[];
  themeAffinity?: ThemeKey[];
  tribeBadges?: ThemeKey[];
}

export const marketAreas = [
  "Westlands",
  "Kilimani",
  "Karen",
  "Lavington",
  "South B",
  "South C",
  "Parklands",
  "Ruaka",
  "Thika Road",
] as const;

export const serviceCategories = [
  {
    id: "braids",
    name: "Braids",
    detail: "Protective styles from knotless to fulani.",
    color: "from-[var(--ms-magenta)]/30 to-[var(--ms-gold)]/25",
    image: imageAssets.braidsPortrait,
  },
  {
    id: "natural-hair",
    name: "Natural Hair",
    detail: "Wash days, twists, silk press, and healthy care.",
    color: "from-[var(--ms-navy)]/80 to-[var(--ms-purple)]/30",
    image: imageAssets.naturalHair,
  },
  {
    id: "weaves",
    name: "Weaves",
    detail: "Closures, frontal installs, and maintenance.",
    color: "from-[var(--ms-mauve)]/40 to-[var(--ms-magenta)]/20",
    image: imageAssets.salonBraiding,
  },
  {
    id: "nails",
    name: "Nails",
    detail: "Gel, acrylic, detailed nail art, and spa finishes.",
    color: "from-[var(--ms-blush)] to-[var(--ms-gold)]/30",
    image: imageAssets.nails,
  },
  {
    id: "make-up",
    name: "Make-Up",
    detail: "Soft glam, bridal, editorial, and event-ready beats.",
    color: "from-[var(--ms-navy)]/80 to-[var(--ms-magenta)]/25",
    image: imageAssets.makeupArtist,
  },
  {
    id: "lashes",
    name: "Lashes",
    detail: "Classic, hybrid, brow sculpting, and threading.",
    color: "from-[var(--ms-purple)]/30 to-[var(--ms-blush)]",
    image: imageAssets.lashesTools,
  },
  {
    id: "short-hair-shave",
    name: "Short Hair & Shave",
    detail: "Low cuts, undercut art, soft fades, and glow facials.",
    color: "from-[var(--ms-plum)]/90 to-[var(--ms-blush)]/35",
    image: imageAssets.barber,
  },
  {
    id: "self-care",
    name: "Self-Care",
    detail: "Waxing, massage, body polish, hand care, and foot care.",
    color: "from-[var(--ms-champagne)] to-[var(--ms-rose)]/20",
    image: imageAssets.spaCare,
  },
  {
    id: "bridal",
    name: "Bridal",
    detail: "Trials, group bookings, and all-day glam support.",
    color: "from-[var(--ms-blush)] to-[var(--ms-magenta)]/15",
    image: imageAssets.makeupArtist,
  },
];

const coreServices: Service[] = [
  {
    id: "knotless-braids",
    category: "Hair",
    name: "Knotless Braids",
    description: "Mid-back protective braids with clean sections and tension-light install.",
    minPrice: 3000,
    maxPrice: 6500,
    durationMin: 180,
    durationMax: 360,
    inclusions: "Consultation, sectioning, braid install, dip, and finishing mousse.",
    popular: true,
  },
  {
    id: "fulani-braids",
    category: "Hair",
    name: "Fulani Braids",
    description: "Beaded or clean centre-parted fulani styling with face-framing detail.",
    minPrice: 3500,
    maxPrice: 7000,
    durationMin: 210,
    durationMax: 360,
    inclusions: "Scalp prep, braid pattern mapping, accessories placement, and finish.",
  },
  {
    id: "loc-retwist",
    category: "Hair",
    name: "Loc Retwist",
    description: "Palm roll or interlock maintenance with scalp care.",
    minPrice: 2500,
    maxPrice: 5000,
    durationMin: 120,
    durationMax: 180,
    inclusions: "Wash, scalp cleanse, retwist, dry, and light styling.",
    popular: true,
  },
  {
    id: "silk-press",
    category: "Hair",
    name: "Silk Press",
    description: "Heat-protected straight finish for textured hair with bounce and movement.",
    minPrice: 2200,
    maxPrice: 4200,
    durationMin: 90,
    durationMax: 150,
    inclusions: "Shampoo, deep condition, blow dry, trim check, and silk finish.",
  },
  {
    id: "wig-install",
    category: "Hair",
    name: "Wig Install",
    description: "Natural-looking lace install with styling and secure hold.",
    minPrice: 3500,
    maxPrice: 7000,
    durationMin: 120,
    durationMax: 210,
    inclusions: "Braid down, lace prep, install, customization, and styling.",
  },
  {
    id: "facial-treatment",
    category: "Care / Skin",
    name: "Melanin Facial",
    description: "Barrier-safe facial designed for congestion, texture, and glow.",
    minPrice: 2000,
    maxPrice: 4500,
    durationMin: 60,
    durationMax: 90,
    inclusions: "Cleanse, steam, extraction if needed, mask, and aftercare guidance.",
    popular: true,
  },
  {
    id: "makeup-soft-glam",
    category: "Make-Up",
    name: "Soft Glam",
    description: "Event-ready complexion and eye work tailored for melanin-rich skin.",
    minPrice: 3500,
    maxPrice: 6000,
    durationMin: 75,
    durationMax: 120,
    inclusions: "Skin prep, complexion match, lashes, setting, and touch-up advice.",
    popular: true,
  },
  {
    id: "bridal-glam",
    category: "Bridal & Events",
    name: "Bridal Hair & Make-Up",
    description: "Trial-supported bridal glam with timeline planning for the full day.",
    minPrice: 12000,
    maxPrice: 28000,
    durationMin: 180,
    durationMax: 300,
    inclusions: "Consultation, trial planning, wedding day glam, and finishing support.",
    popular: true,
  },
  {
    id: "gel-manicure",
    category: "Nails",
    name: "Gel Manicure",
    description: "Short or medium nails with cuticle work and glossy gel finish.",
    minPrice: 1500,
    maxPrice: 2800,
    durationMin: 45,
    durationMax: 75,
    inclusions: "Shape, cuticle prep, gel application, and finishing oil.",
  },
  {
    id: "pedicure-spa",
    category: "Nails",
    name: "Spa Pedicure",
    description: "Foot soak, scrub, cuticle care, and long-wear polish option.",
    minPrice: 1800,
    maxPrice: 3200,
    durationMin: 50,
    durationMax: 75,
    inclusions: "Soak, exfoliation, massage, grooming, and polish.",
  },
  {
    id: "lash-classic",
    category: "Lashes / Brows",
    name: "Classic Lash Set",
    description: "Soft, lightweight lash enhancement with natural fullness.",
    minPrice: 2500,
    maxPrice: 4200,
    durationMin: 75,
    durationMax: 120,
    inclusions: "Consultation, lash map, application, and aftercare instructions.",
  },
  {
    id: "brow-threading",
    category: "Lashes / Brows",
    name: "Brow Threading",
    description: "Clean brow shape with balanced arch and sensitive-skin care.",
    minPrice: 600,
    maxPrice: 1000,
    durationMin: 20,
    durationMax: 30,
    inclusions: "Consultation, threading, trim if needed, and soothing gel.",
  },
  {
    id: "mens-fade",
    category: "Short Hair & Shave",
    name: "Soft Low Cut",
    description: "Feminine low cut or soft fade with clean edges and polished finish.",
    minPrice: 1200,
    maxPrice: 2200,
    durationMin: 35,
    durationMax: 60,
    inclusions: "Consultation, cut, edge detail, and soft finish.",
    popular: true,
  },
  {
    id: "beard-sculpt",
    category: "Short Hair & Shave",
    name: "Undercut Detail",
    description: "Nape, side-shave, or undercut clean-up with neat line detail.",
    minPrice: 900,
    maxPrice: 1600,
    durationMin: 25,
    durationMax: 40,
    inclusions: "Trim, line definition, soothing care, and finishing balm.",
  },
  {
    id: "wash-and-go",
    category: "Hair",
    name: "Wash and Go",
    description: "Hydrating cleanse and curl definition for 3C to 4C textures.",
    minPrice: 1800,
    maxPrice: 3200,
    durationMin: 60,
    durationMax: 90,
    inclusions: "Cleanse, detangle, deep condition, styling gel, and drying.",
  },
  {
    id: "relaxer-treatment",
    category: "Hair",
    name: "Relaxer Treatment",
    description: "Professional relaxer service with protein care and trim support.",
    minPrice: 2500,
    maxPrice: 4000,
    durationMin: 120,
    durationMax: 180,
    inclusions: "Application, rinse, neutralize, deep treatment, trim, and style.",
  },
  {
    id: "nail-art-upgrade",
    category: "Nails",
    name: "Nail Art Upgrade",
    description: "Detailed art add-on from chrome details to custom line work.",
    minPrice: 700,
    maxPrice: 1800,
    durationMin: 20,
    durationMax: 45,
    inclusions: "Art consultation, detailed design, top coat, and finish.",
  },
];

const expandedServices: Service[] = [
  {
    id: "boho-braids",
    category: "Hair",
    name: "Boho Braids",
    description: "Soft protective braids with curly detail and a feminine, airy finish.",
    minPrice: 4500,
    maxPrice: 8500,
    durationMin: 240,
    durationMax: 420,
    inclusions: "Consultation, sectioning, braid install, curl placement, dip, and finish.",
    trending: true,
  },
  {
    id: "cornrows",
    category: "Hair",
    name: "Cornrows",
    description: "Clean cornrow styling for everyday wear, wig prep, or protective looks.",
    minPrice: 1200,
    maxPrice: 3500,
    durationMin: 60,
    durationMax: 180,
    inclusions: "Parting, braid pattern, edge care, and finishing mousse.",
  },
  {
    id: "natural-hair-styling",
    category: "Hair",
    name: "Natural Hair Styling",
    description: "Twists, bantu knots, puff styling, or defined curls for textured hair.",
    minPrice: 1800,
    maxPrice: 4200,
    durationMin: 75,
    durationMax: 150,
    inclusions: "Detangle check, styling product, shaping, and aftercare notes.",
    popular: true,
  },
  {
    id: "wash-blow-dry",
    category: "Hair",
    name: "Wash & Blow Dry",
    description: "A clean wash day base before braids, wig installs, or styling.",
    minPrice: 1200,
    maxPrice: 2500,
    durationMin: 45,
    durationMax: 90,
    inclusions: "Shampoo, condition, detangle, heat protectant, and blow dry.",
  },
  {
    id: "wig-revamp",
    category: "Hair",
    name: "Wig Revamp",
    description: "Refresh an existing wig so it feels clean, shaped, and wearable again.",
    minPrice: 2500,
    maxPrice: 5500,
    durationMin: 90,
    durationMax: 180,
    inclusions: "Wash, conditioning, lace clean-up, styling, and fit check.",
  },
  {
    id: "weave-install",
    category: "Hair",
    name: "Weave Install",
    description: "Secure weave install with natural leave-out or closure support.",
    minPrice: 3500,
    maxPrice: 7500,
    durationMin: 150,
    durationMax: 270,
    inclusions: "Braid down, install, blending, cutting if needed, and styling.",
  },
  {
    id: "hair-treatment",
    category: "Hair",
    name: "Hair Treatment",
    description: "Moisture, protein, or scalp-focused care for stressed textured hair.",
    minPrice: 1800,
    maxPrice: 4200,
    durationMin: 60,
    durationMax: 120,
    inclusions: "Hair check, cleanse, treatment, steam or processing time, and finish.",
  },
  {
    id: "loc-styling",
    category: "Hair",
    name: "Loc Styling",
    description: "Loc barrels, curls, updos, or neat everyday styling after maintenance.",
    minPrice: 1800,
    maxPrice: 4200,
    durationMin: 60,
    durationMax: 150,
    inclusions: "Style mapping, hold product, pinning if needed, and finish.",
  },
  {
    id: "hair-colour",
    category: "Hair",
    name: "Hair Colour",
    description: "Colour refresh or fashion shade consultation with hair health in mind.",
    minPrice: 3500,
    maxPrice: 9000,
    durationMin: 120,
    durationMax: 270,
    inclusions: "Consultation, colour application, rinse, treatment, and finish.",
  },
  {
    id: "classic-manicure",
    category: "Nails",
    name: "Classic Manicure",
    description: "Neat natural nail grooming with polish or clean buff finish.",
    minPrice: 900,
    maxPrice: 1800,
    durationMin: 35,
    durationMax: 60,
    inclusions: "Shape, cuticle care, hand care, polish, and finishing oil.",
  },
  {
    id: "acrylic-full-set",
    category: "Nails",
    name: "Acrylic Full Set",
    description: "Fresh acrylic extensions with shape, colour, and smooth finish.",
    minPrice: 2800,
    maxPrice: 6000,
    durationMin: 90,
    durationMax: 150,
    inclusions: "Prep, extension, acrylic overlay, shaping, gel colour, and oil.",
    trending: true,
  },
  {
    id: "acrylic-refill",
    category: "Nails",
    name: "Acrylic Refill",
    description: "Maintenance refill for grown-out acrylic sets.",
    minPrice: 1800,
    maxPrice: 3800,
    durationMin: 60,
    durationMax: 105,
    inclusions: "Lift check, fill, reshaping, colour refresh, and finish.",
  },
  {
    id: "gel-pedicure",
    category: "Nails",
    name: "Gel Pedicure",
    description: "Pedicure grooming with long-wear gel polish.",
    minPrice: 2200,
    maxPrice: 3800,
    durationMin: 60,
    durationMax: 90,
    inclusions: "Soak, scrub, cuticle care, gel polish, and foot cream.",
  },
  {
    id: "french-tip",
    category: "Nails",
    name: "French Tip",
    description: "Classic or coloured french detail for hands or toes.",
    minPrice: 700,
    maxPrice: 1600,
    durationMin: 20,
    durationMax: 45,
    inclusions: "Tip design, clean line work, top coat, and finish.",
  },
  {
    id: "toe-polish",
    category: "Nails",
    name: "Toe Polish",
    description: "Quick toe polish refresh when you need a neat finish fast.",
    minPrice: 500,
    maxPrice: 1200,
    durationMin: 20,
    durationMax: 35,
    inclusions: "Light prep, polish, top coat, and drying guidance.",
  },
  {
    id: "full-glam",
    category: "Make-Up",
    name: "Full Glam",
    description: "Full event glam with stronger eye detail, skin finish, and lashes.",
    minPrice: 4500,
    maxPrice: 8500,
    durationMin: 90,
    durationMax: 150,
    inclusions: "Skin prep, complexion match, eye work, lashes, lip, and setting.",
    trending: true,
  },
  {
    id: "brow-shaping",
    category: "Lashes / Brows",
    name: "Brow Shaping",
    description: "Balanced brow shaping that keeps your natural face structure in mind.",
    minPrice: 700,
    maxPrice: 1300,
    durationMin: 20,
    durationMax: 35,
    inclusions: "Shape consultation, tidy, trim if needed, and soothing care.",
  },
  {
    id: "brow-tint",
    category: "Lashes / Brows",
    name: "Brow Tint",
    description: "Soft brow tint for fuller definition without a harsh finish.",
    minPrice: 1200,
    maxPrice: 2200,
    durationMin: 25,
    durationMax: 45,
    inclusions: "Shade check, tint application, clean-up, and aftercare guidance.",
  },
  {
    id: "lash-refill",
    category: "Lashes / Brows",
    name: "Lash Refill",
    description: "Refill appointment to keep lash extensions neat and balanced.",
    minPrice: 1800,
    maxPrice: 3500,
    durationMin: 45,
    durationMax: 75,
    inclusions: "Retention check, lash clean, refill, and aftercare reminder.",
  },
  {
    id: "lash-lift",
    category: "Lashes / Brows",
    name: "Lash Lift",
    description: "Natural lash lift for a soft open-eye effect without extensions.",
    minPrice: 2500,
    maxPrice: 4200,
    durationMin: 45,
    durationMax: 75,
    inclusions: "Lift, optional tint, conditioning, and aftercare.",
  },
  {
    id: "cleanup-facial",
    category: "Care / Skin",
    name: "Cleanup Facial",
    description: "Simple glow facial for congestion, sweat, and city-week buildup.",
    minPrice: 1500,
    maxPrice: 3200,
    durationMin: 45,
    durationMax: 75,
    inclusions: "Cleanse, steam, mask, moisturise, and SPF guidance.",
  },
  {
    id: "waxing",
    category: "Self-Care / Beauty",
    name: "Waxing",
    description: "Gentle waxing options for underarms, legs, arms, or bikini line.",
    minPrice: 900,
    maxPrice: 4500,
    durationMin: 20,
    durationMax: 90,
    inclusions: "Area prep, waxing, soothing care, and aftercare instructions.",
  },
  {
    id: "threading",
    category: "Self-Care / Beauty",
    name: "Threading",
    description: "Precise facial threading for brows, upper lip, chin, or full face.",
    minPrice: 500,
    maxPrice: 1800,
    durationMin: 15,
    durationMax: 45,
    inclusions: "Threading, soothing gel, and sensitive-skin care.",
  },
  {
    id: "massage",
    category: "Self-Care / Beauty",
    name: "Massage",
    description: "Relaxing massage for tired shoulders, back tension, or full reset.",
    minPrice: 2500,
    maxPrice: 6500,
    durationMin: 45,
    durationMax: 90,
    inclusions: "Consultation, massage session, pressure check, and aftercare.",
    trending: true,
  },
  {
    id: "body-polish",
    category: "Self-Care / Beauty",
    name: "Body Polish",
    description: "Smooth skin prep for travel, events, shoots, or self-care weekends.",
    minPrice: 3000,
    maxPrice: 7000,
    durationMin: 60,
    durationMax: 120,
    inclusions: "Cleanse, exfoliation, rinse, moisturising finish, and care notes.",
  },
  {
    id: "hand-care",
    category: "Self-Care / Beauty",
    name: "Hand Care",
    description: "Soft hand treatment for dry hands, cuticles, and gentle polish prep.",
    minPrice: 900,
    maxPrice: 1800,
    durationMin: 25,
    durationMax: 45,
    inclusions: "Soak, scrub, cuticle care, moisturise, and oil.",
  },
  {
    id: "foot-care",
    category: "Self-Care / Beauty",
    name: "Foot Care",
    description: "Focused foot care for tired feet, dry heels, and neat sandal days.",
    minPrice: 1200,
    maxPrice: 2600,
    durationMin: 35,
    durationMax: 60,
    inclusions: "Soak, scrub, heel care, moisturise, and finish.",
  },
];

function inferServiceTheme(service: Service): ThemeKey {
  if (service.category === "Hair" && /braid|loc|cornrow/i.test(service.name)) {
    return "cultural";
  }

  if (service.category === "Hair" || service.category === "Care / Skin") {
    return "natural";
  }

  if (service.category === "Nails" || service.category === "Lashes / Brows") {
    return service.name.toLowerCase().includes("nude") || service.name.toLowerCase().includes("classic")
      ? "african_nude"
      : "feminine";
  }

  if (service.category === "Self-Care / Beauty") {
    return "spiritual";
  }

  if (service.category === "Bridal & Events") {
    return "cultural";
  }

  return "feminine";
}

export const services: Service[] = [...coreServices, ...expandedServices].map((service) => ({
  ...service,
  themeTag: service.themeTag ?? inferServiceTheme(service),
}));

export const marketplacePackages: PackageOffer[] = [
  {
    id: "baby-shower-ready",
    name: "Baby Shower Ready",
    description: "Soft glam, neat nails, and gentle hair styling for a calm celebration day.",
    price: 9800,
    serviceIds: ["makeup-soft-glam", "gel-manicure", "natural-hair-styling"],
    badge: "Soft occasion",
    includedServices: ["Soft glam", "Gel manicure", "Natural hair styling"],
    bestFor: "Mums-to-be and intimate family events",
    trending: true,
    themeTag: "feminine",
  },
  {
    id: "honeymoon-ready",
    name: "Honeymoon Ready",
    description: "Fresh lashes, nails, waxing, and body polish so packing feels lighter.",
    price: 14500,
    serviceIds: ["lash-lift", "gel-pedicure", "waxing", "body-polish"],
    badge: "Travel prep",
    includedServices: ["Lash lift", "Gel pedicure", "Waxing", "Body polish"],
    bestFor: "Travel, honeymoon, and beach-ready care",
    trending: true,
    themeTag: "spiritual",
  },
  {
    id: "birthday-glow",
    name: "Birthday Glow",
    description: "Full glam, nail art, and styling for a birthday look that photographs beautifully.",
    price: 12600,
    serviceIds: ["full-glam", "nail-art-upgrade", "wig-install"],
    badge: "Celebration",
    includedServices: ["Full glam", "Nail art", "Wig install"],
    bestFor: "Dinner, club night, or birthday shoot",
    themeTag: "feminine",
  },
  {
    id: "bridal-morning",
    name: "Bridal Morning",
    description: "Bridal glam with timeline support so the morning feels organised, not rushed.",
    price: 28000,
    serviceIds: ["bridal-glam", "makeup-soft-glam", "gel-manicure"],
    badge: "Wedding day",
    includedServices: ["Bridal hair and make-up", "Touch-up support", "Gel manicure"],
    bestFor: "Bride and close-prep morning",
    trending: true,
    themeTag: "cultural",
  },
  {
    id: "weekend-reset",
    name: "Weekend Reset",
    description: "A practical self-care bundle for hair, nails, and skin after a heavy week.",
    price: 8200,
    serviceIds: ["wash-and-go", "classic-manicure", "cleanup-facial"],
    badge: "Self-care",
    includedServices: ["Wash and go", "Classic manicure", "Cleanup facial"],
    bestFor: "Saturday reset and Sunday confidence",
    themeTag: "natural",
  },
  {
    id: "vacation-prep",
    name: "Vacation Prep",
    description: "Protective style, toes, waxing, and lashes before you head out of Nairobi.",
    price: 18500,
    serviceIds: ["boho-braids", "gel-pedicure", "waxing", "lash-classic"],
    badge: "Travel favourite",
    includedServices: ["Boho braids", "Gel pedicure", "Waxing", "Classic lashes"],
    bestFor: "Holiday prep and low-maintenance travel",
    trending: true,
    themeTag: "cultural",
  },
  {
    id: "corporate-event-ready",
    name: "Corporate Event Ready",
    description: "Polished hair, soft glam, and neat nails for professional rooms and cameras.",
    price: 10500,
    serviceIds: ["silk-press", "makeup-soft-glam", "gel-manicure"],
    badge: "Work event",
    includedServices: ["Silk press", "Soft glam", "Gel manicure"],
    bestFor: "Conferences, panels, shoots, and work dinners",
    themeTag: "african_nude",
  },
  {
    id: "photoshoot-ready",
    name: "Photoshoot Ready",
    description: "Make-up, hair, and detail-ready nails for portraits, content, or campaigns.",
    price: 13500,
    serviceIds: ["full-glam", "wig-install", "nail-art-upgrade"],
    badge: "Camera ready",
    includedServices: ["Full glam", "Wig install", "Nail detail"],
    bestFor: "Brand shoots, maternity shoots, and content days",
    themeTag: "feminine",
  },
];

export const salons: Salon[] = [
  {
    slug: "kilimani-texture-house",
    name: "Kilimani Texture House",
    tagline: "Healthy textured hair care, braid installs, and premium wash days.",
    location: "Kilimani, Nairobi",
    areasServed: ["Kilimani", "Hurlingham", "Lavington", "Upper Hill"],
    rating: 4.9,
    reviewCount: 248,
    startingPrice: 1800,
    categoryTags: ["Natural Hair", "Braids", "Locs", "Bridal"],
    verified: true,
    mobileService: true,
    about:
      "A Nairobi salon built around healthy African hair routines, protective styling, and calm appointment pacing.",
    description:
      "Clients come here for braid installs that respect the hairline, wash days that feel restorative, and bridal prep that is organised from trial to finish.",
    heroMood: "from-[var(--ms-navy)] via-[#15253a] to-[var(--ms-magenta)]/40",
    image: imageAssets.salonBraiding,
    themeAffinity: ["natural", "cultural", "feminine"],
    tribeBadges: ["natural", "cultural"],
    serviceIds: [
      "knotless-braids",
      "boho-braids",
      "cornrows",
      "fulani-braids",
      "natural-hair-styling",
      "wash-and-go",
      "wash-blow-dry",
      "hair-treatment",
      "silk-press",
      "loc-retwist",
      "loc-styling",
      "bridal-glam",
    ],
    topServiceIds: ["knotless-braids", "boho-braids", "wash-and-go"],
    packageOffers: [
      {
        id: "kilimani-wash-reset",
        name: "Texture Reset",
        description: "Wash, steam, trim check, and curl-setting finish for busy Nairobi weeks.",
        price: 4200,
        serviceIds: ["wash-and-go"],
        badge: "Popular package",
        themeTag: "natural",
      },
      {
        id: "kilimani-bridal",
        name: "Civil Ceremony Edit",
        description: "Soft bridal hair and make-up for intimate ceremonies and city weddings.",
        price: 17500,
        serviceIds: ["bridal-glam"],
        badge: "Bridal favourite",
        themeTag: "cultural",
      },
    ],
    gallery: [
      { id: "g1", title: "Soft knotless finish", note: "Mid-back, light tension, side part.", tint: "from-[#251134] to-[#7b2cbf]", themeTag: "cultural" },
      { id: "g2", title: "Defined twist-out", note: "Healthy sheen and shape retention after wash day.", tint: "from-[#0d1b2a] to-[#3a506b]", themeTag: "natural" },
      { id: "g3", title: "Bride trial look", note: "Modern bun with soft glam finish.", tint: "from-[#f2d7ee] to-[#c9a84c]", themeTag: "feminine" },
      { id: "g4", title: "Loc barrel detail", note: "Weekend-ready finish with scalp polish.", tint: "from-[#1f1f1f] to-[#8c7280]", themeTag: "cultural" },
    ],
    faq: [
      {
        question: "Do you provide braiding fibre?",
        answer: "Yes. The price range shows labour only or labour plus standard fibre options depending on the style selected.",
      },
      {
        question: "Can I book at-home service?",
        answer: "Yes. We cover Kilimani, Lavington, Hurlingham, Kileleshwa, and nearby zones for selected services.",
      },
    ],
    professionals: ["njeri-kamau", "faith-odhiambo"],
    nextAvailable: "Today, 4:30 PM",
    responseSpeedMinutes: 9,
    completionRate: 98,
    repeatBookings: 186,
    savedCount: 420,
    trendingScore: 92,
  },
  {
    slug: "westlands-polish-room",
    name: "Westlands Polish Room",
    tagline: "High-detail nails, lashes, and polished express appointments.",
    location: "Westlands, Nairobi",
    areasServed: ["Westlands", "Parklands", "Kileleshwa", "Loresho"],
    rating: 4.8,
    reviewCount: 196,
    startingPrice: 1500,
    categoryTags: ["Nails", "Lashes", "Brows"],
    verified: true,
    mobileService: false,
    about:
      "An appointment-led salon for sharp nail work, clean sanitation standards, and dependable after-work slots.",
    description:
      "Ideal for clients who need quick, reliable beauty maintenance with visible pricing and neat finishing.",
    heroMood: "from-[var(--ms-blush)] via-white to-[var(--ms-gold)]/30",
    image: imageAssets.nails,
    themeAffinity: ["african_nude", "feminine", "spiritual"],
    tribeBadges: ["african_nude", "feminine"],
    serviceIds: [
      "gel-manicure",
      "classic-manicure",
      "acrylic-full-set",
      "gel-pedicure",
      "pedicure-spa",
      "nail-art-upgrade",
      "french-tip",
      "lash-classic",
      "lash-refill",
      "lash-lift",
      "brow-threading",
      "brow-shaping",
      "brow-tint",
    ],
    topServiceIds: ["gel-manicure", "acrylic-full-set", "lash-classic"],
    packageOffers: [
      {
        id: "westlands-late-afternoon",
        name: "After Work Reset",
        description: "Gel manicure plus brow tidy for late afternoon bookings.",
        price: 3200,
        serviceIds: ["gel-manicure", "brow-threading"],
        badge: "Fast turnaround",
        themeTag: "african_nude",
      },
    ],
    gallery: [
      { id: "g5", title: "Chocolate chrome set", note: "Short square with mirror finish.", tint: "from-[#543864] to-[#ff6f91]", themeTag: "feminine" },
      { id: "g6", title: "Minimal french detail", note: "Warm nude base with thin gold line.", tint: "from-[#f9d0e8] to-[#faf6f1]", themeTag: "african_nude" },
      { id: "g7", title: "Classic lash map", note: "Soft volume for everyday wear.", tint: "from-[#1f1f1f] to-[#d9a441]", themeTag: "feminine" },
      { id: "g8", title: "Spa pedicure set-up", note: "Sanitised tools and calm finish zone.", tint: "from-[#f0ebe3] to-[#c9a84c]", themeTag: "spiritual" },
    ],
    faq: [
      {
        question: "Do you remove previous gel work?",
        answer: "Yes. Removal can be booked as an add-on before selecting the new service.",
      },
      {
        question: "How long should I keep classic lashes?",
        answer: "Refills are usually best after two to three weeks, depending on care and natural shedding.",
      },
    ],
    professionals: ["amina-mwangi"],
    nextAvailable: "Tomorrow, 10:00 AM",
    responseSpeedMinutes: 12,
    completionRate: 97,
    repeatBookings: 142,
    savedCount: 318,
    trendingScore: 86,
  },
  {
    slug: "south-b-groom-lab",
    name: "South B Shear Salon",
    tagline: "Feminine low cuts, undercut detail, and quick glow facials.",
    location: "South B, Nairobi",
    areasServed: ["South B", "South C", "Mombasa Road", "Industrial Area"],
    rating: 4.7,
    reviewCount: 124,
    startingPrice: 900,
    categoryTags: ["Short Hair & Shave", "Facials", "Mobile"],
    verified: true,
    mobileService: true,
    about:
      "Built for women who love low cuts, side shaves, undercut art, and polished weekly refreshes.",
    description:
      "Ideal for crisp feminine cuts, dependable start times, and optional home or office call-outs.",
    heroMood: "from-[var(--ms-plum)] via-[#5a2453] to-[var(--ms-gold)]/30",
    image: imageAssets.barber,
    themeAffinity: ["african_nude", "spiritual", "natural"],
    tribeBadges: ["african_nude", "spiritual"],
    serviceIds: ["mens-fade", "beard-sculpt", "facial-treatment", "cleanup-facial", "massage"],
    topServiceIds: ["mens-fade", "beard-sculpt", "facial-treatment"],
    packageOffers: [
      {
        id: "southb-boardroom",
        name: "Clean Cut Glow",
        description: "Low cut refresh, undercut detail, and express facial before a meeting or event.",
        price: 4200,
        serviceIds: ["mens-fade", "beard-sculpt", "facial-treatment"],
        badge: "Most booked",
        themeTag: "african_nude",
      },
    ],
    gallery: [
      { id: "g9", title: "Low cut finish", note: "Soft line detail with natural crown blend.", tint: "from-[#3a183a] to-[#f9d0e8]" },
      { id: "g10", title: "Undercut detail", note: "Clean nape shape with soothing finish.", tint: "from-[#1f1f1f] to-[#8b5cf6]" },
      { id: "g11", title: "Express facial prep", note: "Clean station and skin-safe product line.", tint: "from-[#0d1b2a] to-[#d9a441]" },
      { id: "g12", title: "Mobile shear kit", note: "Office-ready or at-home set-up.", tint: "from-[#334155] to-[#1f1f1f]" },
    ],
    faq: [
      {
        question: "Can I book a mobile office visit?",
        answer: "Yes. Mobile slots are available in South B, South C, and along Mombasa Road by request.",
      },
      {
        question: "Do you take walk-ins?",
        answer: "Walk-ins depend on gaps in the day, but the platform booking is the fastest way to secure a slot.",
      },
    ],
    professionals: ["kevin-ochieng"],
    nextAvailable: "Today, 6:15 PM",
    responseSpeedMinutes: 7,
    completionRate: 95,
    repeatBookings: 88,
    savedCount: 206,
    trendingScore: 79,
  },
];

export const professionals: Professional[] = [
  {
    slug: "njeri-kamau",
    name: "Njeri Kamau",
    specialty: "Protective styling and healthy natural hair care",
    location: "Kilimani",
    serviceMode: "Both",
    salonAffiliation: "Kilimani Texture House",
    areasServed: ["Kilimani", "Lavington", "Kileleshwa", "Hurlingham"],
    rating: 4.9,
    reviewCount: 132,
    startingPrice: 2200,
    verified: true,
    bio:
      "Specialises in low-tension protective styles, wash-day recovery, and bridal prep for textured hair.",
    description:
      "Known for explaining what each service includes, how long it will take, and what aftercare actually matters.",
    heroMood: "from-[var(--ms-purple)]/35 via-[var(--ms-navy)] to-[var(--ms-magenta)]/30",
    image: imageAssets.braidsPortrait,
    themeAffinity: ["natural", "cultural", "feminine"],
    tribeBadges: ["natural", "cultural"],
    serviceIds: ["knotless-braids", "boho-braids", "fulani-braids", "natural-hair-styling", "wash-and-go", "wash-blow-dry", "silk-press"],
    packageOffers: [
      {
        id: "njeri-refresh",
        name: "Wash Day + Silk Finish",
        description: "Healthy scalp reset followed by a clean silk press finish.",
        price: 5600,
        serviceIds: ["wash-and-go", "silk-press"],
        badge: "Haircare favourite",
        themeTag: "natural",
      },
    ],
    gallery: [
      { id: "p1", title: "Shoulder-length knotless", note: "Smart office-ready finish.", tint: "from-[#221c35] to-[#7c3aed]", themeTag: "cultural" },
      { id: "p2", title: "Defined wash and go", note: "Hydrated curl pattern and soft hold.", tint: "from-[#0d1b2a] to-[#1d4ed8]", themeTag: "natural" },
      { id: "p3", title: "Silk press finish", note: "Movement retained without flatness.", tint: "from-[#fdf2f8] to-[#c9a84c]", themeTag: "african_nude" },
      { id: "p4", title: "Fulani detail", note: "Crisp centre part with subtle beads.", tint: "from-[#4c1d95] to-[#ec4899]", themeTag: "cultural" },
    ],
    faq: [
      {
        question: "Do you work with children?",
        answer: "Yes, for selected braiding and wash-day services when the slot timing is confirmed in advance.",
      },
      {
        question: "How should I prepare for an install?",
        answer: "Arrive with your hair detangled where possible, or add a wash and prep service during booking.",
      },
    ],
    nextAvailable: "Today, 3:00 PM",
    responseSpeedMinutes: 6,
    completionRate: 99,
    repeatBookings: 112,
    savedCount: 354,
    trendingScore: 94,
    identityAttributes: ["Woman-led", "Texture specialist", "Mobile-friendly"],
  },
  {
    slug: "faith-odhiambo",
    name: "Faith Odhiambo",
    specialty: "Bridal hair, soft glam, and occasion-ready finishes",
    location: "Karen",
    serviceMode: "Mobile",
    salonAffiliation: "Independent",
    areasServed: ["Karen", "Lang'ata", "Kilimani", "Lavington"],
    rating: 4.9,
    reviewCount: 88,
    startingPrice: 3500,
    verified: true,
    bio:
      "Mobile artist for brides, wedding parties, and polished event bookings that need calm coordination.",
    description:
      "Faith is booked for her calm prep timelines, shade matching for melanin-rich skin, and clear pre-event communication.",
    heroMood: "from-[var(--ms-blush)] via-white to-[var(--ms-magenta)]/25",
    image: imageAssets.makeupArtist,
    themeAffinity: ["feminine", "cultural", "spiritual"],
    tribeBadges: ["feminine", "cultural"],
    serviceIds: ["makeup-soft-glam", "full-glam", "bridal-glam"],
    packageOffers: [
      {
        id: "faith-bride",
        name: "Bride + Maid Pairing",
        description: "Wedding day glam for bride plus one maid with schedule planning.",
        price: 23500,
        serviceIds: ["bridal-glam", "makeup-soft-glam"],
        badge: "Wedding day",
        themeTag: "feminine",
      },
    ],
    gallery: [
      { id: "p5", title: "Soft glam finish", note: "Neutral eye, defined skin, fluffy lash.", tint: "from-[#fff1f2] to-[#f9d0e8]", themeTag: "feminine" },
      { id: "p6", title: "Bride trial board", note: "Skin match and hairstyle notes locked early.", tint: "from-[#fce7f3] to-[#c9a84c]", themeTag: "cultural" },
      { id: "p7", title: "Civil look detail", note: "Elegant bun and understated lip finish.", tint: "from-[#8b5cf6] to-[#f472b6]", themeTag: "feminine" },
      { id: "p8", title: "Bridesmaid stack", note: "Timelined four-person morning prep.", tint: "from-[#1f1f1f] to-[#8c7280]", themeTag: "cultural" },
    ],
    faq: [
      {
        question: "Do you travel outside Nairobi?",
        answer: "Yes, by arrangement for weddings and event packages. Travel fees are confirmed before booking.",
      },
      {
        question: "Is a trial mandatory?",
        answer: "A trial is strongly recommended for bridal bookings and is included in premium packages.",
      },
    ],
    nextAvailable: "Tomorrow, 8:30 AM",
    responseSpeedMinutes: 8,
    completionRate: 98,
    repeatBookings: 74,
    savedCount: 287,
    trendingScore: 91,
    identityAttributes: ["Woman-led", "Bridal specialist", "Mobile artist"],
  },
  {
    slug: "amina-mwangi",
    name: "Amina Mwangi",
    specialty: "Nail detail, clean girl manicures, and classic lash work",
    location: "Westlands",
    serviceMode: "In salon",
    salonAffiliation: "Westlands Polish Room",
    areasServed: ["Westlands", "Parklands", "Kileleshwa"],
    rating: 4.8,
    reviewCount: 109,
    startingPrice: 1500,
    verified: true,
    bio:
      "Appointments built around neat prep, hygiene, and wearable beauty maintenance that still feels special.",
    description:
      "Amina is the go-to for clean finishes, strong retention, and subtle nail art that works from office to weekend.",
    heroMood: "from-[var(--ms-ivory)] via-[var(--ms-blush)] to-[var(--ms-gold)]/20",
    image: imageAssets.nails,
    themeAffinity: ["african_nude", "feminine", "spiritual"],
    tribeBadges: ["african_nude", "feminine"],
    serviceIds: ["gel-manicure", "classic-manicure", "acrylic-full-set", "acrylic-refill", "pedicure-spa", "gel-pedicure", "nail-art-upgrade", "lash-classic", "lash-refill", "lash-lift", "brow-threading", "brow-shaping", "brow-tint"],
    packageOffers: [
      {
        id: "amina-clean-week",
        name: "Clean Week Combo",
        description: "Gel manicure and classic lash set for one-booking convenience.",
        price: 6200,
        serviceIds: ["gel-manicure", "lash-classic"],
        badge: "Best value",
        themeTag: "african_nude",
      },
    ],
    gallery: [
      { id: "p9", title: "Short nude gel", note: "Office-safe shine with clean cuticles.", tint: "from-[#fdf2f8] to-[#f59e0b]", themeTag: "african_nude" },
      { id: "p10", title: "Glossy chrome", note: "Mirror detail with almond shape.", tint: "from-[#ec4899] to-[#8b5cf6]", themeTag: "feminine" },
      { id: "p11", title: "Classic lash map", note: "Balanced fullness and soft taper.", tint: "from-[#1f2937] to-[#6b7280]", themeTag: "african_nude" },
      { id: "p12", title: "Delicate line art", note: "Minimalist detailing for everyday wear.", tint: "from-[#f3e8ff] to-[#fbcfe8]", themeTag: "feminine" },
    ],
    faq: [
      {
        question: "Can I combine nails and lashes in one session?",
        answer: "Yes. Combination bookings are encouraged and shown with the total duration before confirmation.",
      },
      {
        question: "Do you offer refill appointments?",
        answer: "Yes. Returning clients can request a refill or maintenance slot directly from their activity page.",
      },
    ],
    nextAvailable: "Tomorrow, 11:15 AM",
    responseSpeedMinutes: 10,
    completionRate: 96,
    repeatBookings: 95,
    savedCount: 269,
    trendingScore: 84,
    identityAttributes: ["Woman-led", "Detail-focused", "Salon based"],
  },
  {
    slug: "kevin-ochieng",
    name: "Wanjiku Ochieng",
    specialty: "Feminine low cuts, undercut detail, and mobile shave care",
    location: "South B",
    serviceMode: "Both",
    salonAffiliation: "South B Shear Salon",
    areasServed: ["South B", "South C", "Mombasa Road", "CBD"],
    rating: 4.7,
    reviewCount: 73,
    startingPrice: 1200,
    verified: true,
    bio:
      "Reliable for women who keep low cuts, side shaves, and polished weekly maintenance bookings.",
    description:
      "Wanjiku focuses on soft precision, strong timing discipline, and shave-care routines that fit busy schedules.",
    heroMood: "from-[#3a183a] via-[var(--ms-plum)] to-[var(--ms-gold)]/35",
    image: imageAssets.beardCare,
    themeAffinity: ["african_nude", "spiritual", "natural"],
    tribeBadges: ["african_nude", "spiritual"],
    serviceIds: ["mens-fade", "beard-sculpt", "facial-treatment", "cleanup-facial", "massage"],
    packageOffers: [
      {
        id: "kevin-reset",
        name: "Low Cut Reset",
        description: "Soft low cut and undercut detail with optional express facial add-on.",
        price: 2600,
        serviceIds: ["mens-fade", "beard-sculpt"],
        badge: "Fast favourite",
        themeTag: "african_nude",
      },
    ],
    gallery: [
      { id: "p13", title: "Temple fade", note: "Clean silhouette with soft crown blend.", tint: "from-[#3a183a] to-[#e83e8c]" },
      { id: "p14", title: "Nape detail", note: "Structured line without harsh finish.", tint: "from-[#1f1f1f] to-[#d97706]" },
      { id: "p15", title: "Mobile set-up", note: "Compact tools for office or home calls.", tint: "from-[#334155] to-[#64748b]" },
      { id: "p16", title: "Express skin refresh", note: "Short facial for weekday recovery.", tint: "from-[#0d1b2a] to-[#0f766e]" },
    ],
    faq: [
      {
        question: "How early should I book for same-day slots?",
        answer: "Same-day windows are possible, but morning requests usually secure the best timing.",
      },
      {
        question: "Can you groom on-site for teams or events?",
        answer: "Yes. Team or event grooming can be arranged through WhatsApp support after the initial request.",
      },
    ],
    nextAvailable: "Today, 5:45 PM",
    responseSpeedMinutes: 5,
    completionRate: 95,
    repeatBookings: 61,
    savedCount: 144,
    trendingScore: 76,
    identityAttributes: ["Woman-led", "Short hair care", "Mobile-friendly"],
  },
];

export const testimonials: ReviewSnapshot[] = [
  {
    id: "r1",
    name: "Anne N.",
    title: "Client, Kilimani",
    rating: 5,
    body: "I booked knotless braids in under two minutes, saw the real price first, and the stylist arrived exactly when promised.",
    serviceLabel: "Knotless braids",
  },
  {
    id: "r2",
    name: "Nimo M.",
    title: "Client, South C",
    rating: 5,
    body: "My low cut refresh was neat, the timing was accurate, and booking through the site was far easier than chasing WhatsApp replies.",
    serviceLabel: "Soft low cut",
  },
  {
    id: "r3",
    name: "Shiko W.",
    title: "Bride, Karen",
    rating: 5,
    body: "I could compare bridal packages, see what was included, and confirm the morning schedule before paying a deposit.",
    serviceLabel: "Bridal glam",
  },
];

export const trustPoints = [
  "Verified profiles and visible prices before booking",
  "Nairobi coverage across Westlands, Kilimani, Karen, South B, Ruaka, and more",
  "Easy rescheduling and WhatsApp support when needed",
  "Clear duration windows, availability, and service inclusions",
];

export const howItWorks = [
  {
    step: "01",
    title: "Choose how you want help",
    description: "Pick a salon, an individual professional, or a package if you want the fastest path.",
  },
  {
    step: "02",
    title: "Select one clear service",
    description: "See the price, timing, and what is included before you move forward.",
  },
  {
    step: "03",
    title: "Pick date and time",
    description: "Choose a slot that works for you, including rush-friendly options when available.",
  },
  {
    step: "04",
    title: "Sign in once",
    description: "Your choices are saved so you do not lose your booking while creating an account.",
  },
  {
    step: "05",
    title: "Pay to secure",
    description: "Payment confirms seriousness and protects both client and professional.",
  },
  {
    step: "06",
    title: "Confirm completion",
    description: "Payout is released after both sides confirm the beauty service was completed.",
  },
];

export const profileCompletionTasks = [
  "Add profile photo and bio",
  "Set service prices and durations",
  "Upload portfolio highlights",
  "Define coverage areas and service mode",
  "Connect payout and dispute contact details",
];

export const activityItems = [
  {
    title: "Upcoming booking",
    detail: "Soft Glam with Faith Odhiambo",
    meta: "Saturday, 9:30 AM · Karen delivery",
  },
  {
    title: "Saved salon",
    detail: "Westlands Polish Room",
    meta: "Gel manicure from KES 1,500",
  },
  {
    title: "Review reminder",
    detail: "Leave feedback for Njeri Kamau",
    meta: "Your last booking finished yesterday",
  },
];

export const supportFaq = [
  {
    question: "How does Mobile Salon handle rescheduling?",
    answer: "Clients can request a new time from the activity page, and the professional sees the change immediately.",
  },
  {
    question: "Can salons and independents both join?",
    answer: "Yes. Independent professionals, mobile providers, and salon teams are all supported within the same platform.",
  },
  {
    question: "Are prices final before booking?",
    answer: "The visible price range and inclusions appear before confirmation. Any add-on must be agreed clearly before the booking is finalised.",
  },
  {
    question: "What if I still prefer WhatsApp?",
    answer: "Every detail page includes WhatsApp support for clients who need direct confirmation without leaving the protected booking flow.",
  },
];

export const bookingDates = [
  { label: "Sat", date: "18 Apr" },
  { label: "Sun", date: "19 Apr" },
  { label: "Mon", date: "20 Apr" },
  { label: "Tue", date: "21 Apr" },
  { label: "Wed", date: "22 Apr" },
];

export const bookingTimes = [
  "8:00 AM",
  "9:30 AM",
  "11:00 AM",
  "1:30 PM",
  "3:00 PM",
  "4:30 PM",
  "6:00 PM",
] as const;

export function getCollection(collection: string) {
  if (collection === "salons") {
    return salons;
  }

  if (collection === "professionals") {
    return professionals;
  }

  return [];
}

export function getSalon(slug: string) {
  return salons.find((salon) => salon.slug === slug);
}

export function getProfessional(slug: string) {
  return professionals.find((professional) => professional.slug === slug);
}

export function getServicesByIds(ids: string[]) {
  return ids
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service));
}

export function getProfessionalsForSalon(slug: string) {
  const salon = getSalon(slug);

  if (!salon) {
    return [];
  }

  return professionals.filter((professional) =>
    salon.professionals.includes(professional.slug),
  );
}
