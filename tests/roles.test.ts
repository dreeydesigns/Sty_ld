/**
 * P0A regression suite — role policy (lib/roles.ts)
 *
 * Vulnerability B: a public signup path accepted a client-supplied `role` and
 * persisted it, which allowed self-assigned super_admin. These assertions pin the
 * policy that a public path may only ever produce a `client`.
 */
import { describe, expect, it } from "vitest";
import { isPrivilegedRole, isPublicSignupRole, resolvePublicSignupRole } from "@/lib/roles";

describe("public signup role policy", () => {
  it("allows only 'client' as a public signup role", () => {
    expect(isPublicSignupRole("client")).toBe(true);
    expect(isPublicSignupRole("professional")).toBe(false);
    expect(isPublicSignupRole("salon")).toBe(false);
    expect(isPublicSignupRole("shop")).toBe(false);
    expect(isPublicSignupRole("delivery")).toBe(false);
  });

  it("rejects privileged roles in any public signup resolution", () => {
    expect(isPrivilegedRole("admin")).toBe(true);
    expect(isPrivilegedRole("super_admin")).toBe(true);
    expect(isPrivilegedRole("team_member")).toBe(true);
    expect(isPrivilegedRole("staff")).toBe(true);
  });

  it("coerces any non-allowlisted requested role to 'client'", () => {
    expect(resolvePublicSignupRole("super_admin")).toBe("client");
    expect(resolvePublicSignupRole("admin")).toBe("client");
    expect(resolvePublicSignupRole("professional")).toBe("client");
    expect(resolvePublicSignupRole(undefined)).toBe("client");
    expect(resolvePublicSignupRole(12345)).toBe("client");
    expect(resolvePublicSignupRole("client")).toBe("client");
  });
});
