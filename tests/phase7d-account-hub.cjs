const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

test("Account Hub component exists and contains key navigation links", () => {
  const file = fs.readFileSync(path.join(__dirname, "..", "components", "account-hub.tsx"), "utf8");
  assert.ok(file.includes("Account hub"), "Component should mention Account hub");
  assert.ok(file.includes("Workspace"), "Should link to Workspace");
  assert.ok(file.includes("Profile"), "Should link to Profile");
  assert.ok(file.includes("Settings"), "Should link to Settings");
  assert.ok(file.includes("Messages"), "Should link to Messages");
  assert.ok(file.includes("Requests"), "Should link to Requests");
  assert.ok(file.includes("Activity"), "Should link to Activity");
  assert.ok(file.includes("Notifications"), "Should link to Notifications");
  assert.ok(file.includes("Sign out"), "Should have sign out");
  assert.ok(file.includes("Account activity honesty"), "Should have honesty notice");
});

test("Notifications page exists and has honest empty state", () => {
  const file = fs.readFileSync(path.join(__dirname, "..", "app", "notifications", "page.tsx"), "utf8");
  assert.ok(file.includes("Notifications"), "Page should mention Notifications");
  assert.ok(file.includes("no notifications"), "Should have empty state message");
  assert.ok(file.includes("fake notification"), "Should mention no fake notifications");
});

test("Settings page uses human-friendly copy", () => {
  const file = fs.readFileSync(path.join(__dirname, "..", "app", "settings", "page.tsx"), "utf8");
  assert.ok(file.includes("Security & devices"), "Should have human-friendly label");
  assert.ok(file.includes("Workspaces & services"), "Should have human-friendly label");
  assert.ok(!file.includes("BOOKING_COMMITMENTS"), "Should not leak feature flags");
  assert.ok(!file.includes("PAYMENTS_LIVE"), "Should not leak feature flags");
});

test("Account hub route exists", () => {
  const file = fs.readFileSync(path.join(__dirname, "..", "app", "account", "page.tsx"), "utf8");
  assert.ok(file.includes("AccountHub"), "Route should import AccountHub");
});
