import type { AppUserRole } from "@/lib/client-session";

export type RoleRoutePolicy = {
  allowedRoles: AppUserRole[];
  fallbackHref: string;
  label: string;
};

export const SOCIAL_HOME_ROLES: AppUserRole[] = ["client", "professional", "salon", "guest", "super_admin"];
export const BOOKING_ROLES: AppUserRole[] = ["client", "super_admin"];
export const PROVIDER_ROLES: AppUserRole[] = ["professional", "salon", "super_admin"];
export const OPERATIONS_ROLES: AppUserRole[] = ["shop", "delivery", "super_admin"];

export const ROLE_ROUTE_POLICIES: Record<string, RoleRoutePolicy> = {
  home: {
    allowedRoles: SOCIAL_HOME_ROLES,
    fallbackHref: "/auth/sign-in?returnTo=/home",
    label: "Universal For You feed",
  },
  book: {
    allowedRoles: BOOKING_ROLES,
    fallbackHref: "/home",
    label: "Client booking",
  },
  profile: {
    allowedRoles: ["client", "professional", "salon", "shop", "delivery", "super_admin"],
    fallbackHref: "/auth/sign-in?returnTo=/profile",
    label: "Account profile",
  },
  providerRequests: {
    allowedRoles: PROVIDER_ROLES,
    fallbackHref: "/profile",
    label: "Provider requests",
  },
  shop: {
    allowedRoles: ["shop", "super_admin"],
    fallbackHref: "/counter",
    label: "Shop operations",
  },
  delivery: {
    allowedRoles: ["delivery", "super_admin"],
    fallbackHref: "/counter",
    label: "Delivery operations",
  },
  admin: {
    allowedRoles: ["super_admin"],
    fallbackHref: "/home",
    label: "Super Admin",
  },
};

export function canAccessRole(userRole: AppUserRole | null | undefined, allowedRoles?: AppUserRole[]) {
  if (!allowedRoles?.length) {
    return Boolean(userRole);
  }

  if (!userRole) {
    return false;
  }

  return allowedRoles.includes(userRole) || userRole === "super_admin";
}

export function getRoleHomeHref(role: AppUserRole | null | undefined) {
  if (role === "shop") {
    return "/shop/dashboard";
  }

  if (role === "delivery") {
    return "/delivery/dashboard";
  }

  return "/home";
}

export function getRolePrimaryAction(role: AppUserRole | null | undefined) {
  if (role === "professional" || role === "salon") {
    // "Requests" is already a dedicated nav item.
    // The CTA drives the action that grows their business: sharing work to get discovered.
    return { label: "New Post", href: "/profile?tab=posts" };
  }

  if (role === "shop") {
    return { label: "Shop", href: "/shop/dashboard" };
  }

  if (role === "delivery") {
    return { label: "Deliveries", href: "/delivery/dashboard" };
  }

  return { label: "Book", href: "/book" };
}
