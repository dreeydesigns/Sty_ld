export type NavigationRole = "guest" | "client" | "professional" | "salon" | "shop" | "delivery" | "super_admin";

export type PrimaryTabKey = "home" | "discover" | "plan" | "me";

export interface PrimaryTab {
  key: string;
  label: string;
  href: string;
}

/** Client and guest application shell destinations. */
export const CLIENT_PRIMARY_TABS: PrimaryTab[] = [
  { key: "home", label: "Home", href: "/home" },
  { key: "discover", label: "Discover", href: "/discover" },
  { key: "plan", label: "Plan", href: "/book" },
  { key: "me", label: "Me", href: "/profile" },
];

/** Guests are invited to accounts only for account-specific destinations. */
export const GUEST_PRIMARY_TABS: PrimaryTab[] = [
  { key: "home", label: "Home", href: "/home" },
  { key: "discover", label: "Discover", href: "/discover" },
  { key: "plan", label: "Plan", href: "/book" },
  { key: "me", label: "Me", href: "/auth/sign-in?returnTo=/profile" },
];

/** Professional and salon workspace destinations retained from the current app. */
export const PROVIDER_PRIMARY_TABS: PrimaryTab[] = [
  { key: "home", label: "Home", href: "/home" },
  { key: "requests", label: "Requests", href: "/profile?tab=requests" },
  { key: "guide", label: "Guide", href: "/guide" },
  { key: "messages", label: "Messages", href: "/profile?tab=messages" },
  { key: "me", label: "Me", href: "/profile" },
];

export function getPrimaryTabsForRole(role: string | null | undefined): PrimaryTab[] {
  switch (role) {
    case "professional":
    case "salon":
      return PROVIDER_PRIMARY_TABS.map((tab) => ({ ...tab }));
    case "guest":
      return GUEST_PRIMARY_TABS.map((tab) => ({ ...tab }));
    default:
      return CLIENT_PRIMARY_TABS.map((tab) => ({ ...tab }));
  }
}

/** Map current nav keys from AppShell into the single highlighted primary tab. */
export function mapCurrentNavToPrimaryTab(
  currentNav: string | null | undefined,
  role: string | null | undefined
): string {
  const isProvider = role === "professional" || role === "salon";
  if (isProvider) {
    switch (currentNav) {
      case "requests":
      case "guide":
      case "messages":
      case "home":
      case "profile":
        return currentNav;
      default:
        return "home";
    }
  }

  switch (currentNav) {
    case "home":
      return "home";
    case "discover":
    case "explore":
    case "professionals":
    case "salons":
    case "services":
      return "discover";
    case "book":
    case "book":
    case "plan":
      return "plan";
    case "profile":
    case "me":
      return "me";
    case "counter":
      return "me";
    default:
      return "home";
  }
}

export function resolveActivePrimaryTab(
  currentNav: string | null | undefined,
  pathname: string | null | undefined,
  role: string | null | undefined
): string {
  // Pathname is authoritative when it clearly maps to a known destination.
  const path = (pathname ?? "").split("?")[0];
  if (path === "/home") return "home";
  if (path === "/discover" || path === "/explore" || path.startsWith("/explore/")) return "discover";
  if (path === "/book") return "plan";
  if (path === "/profile" || path === "/settings") return "me";
  if (path === "/auth/sign-in" || path === "/sign-in" || path === "/sign-up" || path === "/auth/sign-up")
    return "me";

  return mapCurrentNavToPrimaryTab(currentNav, role);
}

export function hasExactlyOneActiveTab(activeKey: string | null | undefined, tabs: PrimaryTab[]): boolean {
  if (!activeKey) return false;
  return tabs.filter((tab) => tab.key === activeKey).length === 1;
}

export function safeInternalDestination(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/home";
  const path = value.split("?")[0];
  if (/^\/(auth|sign-in|sign-up|sso-callback|api)(\/|$)/.test(path)) return "/home";
  return value;
}
