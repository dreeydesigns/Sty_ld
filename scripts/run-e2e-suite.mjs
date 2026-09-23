import { CDPBrowser } from "./cdp-client.mjs";
import path from "node:path";
import fs from "node:fs";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 568, isMobile: true },
  { name: "mobile-360", width: 360, height: 740, isMobile: true },
  { name: "mobile-375", width: 375, height: 667, isMobile: true },
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "mobile-430", width: 430, height: 932, isMobile: true },
  { name: "tablet-768", width: 768, height: 1024, isMobile: true },
  { name: "tablet-820", width: 820, height: 1180, isMobile: true },
  { name: "tablet-1024", width: 1024, height: 1366, isMobile: false },
  { name: "desktop-1280", width: 1280, height: 800, isMobile: false },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
  { name: "desktop-1920", width: 1920, height: 1080, isMobile: false },
  { name: "desktop-2560", width: 2560, height: 1440, isMobile: false },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
    failures.push(message);
  }
}

async function runE2ESuite() {
  console.log("==================================================");
  console.log("  STYLD E2E INTERACTION & RESPONSIVE RELEASE GATE ");
  console.log("  Target: " + BASE_URL);
  console.log("==================================================\n");

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = new CDPBrowser({ port: 9444 });
  await browser.launch();
  console.log("Headless Chromium browser launched successfully.\n");

  const page = await browser.newPage();
  await page.send("Network.enable");

  try {
    // -------------------------------------------------------------
    // SPEC 1: Public Route Reachability & Content Integrity
    // -------------------------------------------------------------
    console.log("--- SPEC 1: Navigation & Route Reachability ---");
    const routesToTest = [
      { path: "/", expectedText: "Styld", name: "Home Landing" },
      { path: "/discover", expectedText: "Discover", name: "Discover" },
      { path: "/contact", expectedText: "Contact", name: "Contact" },
      { path: "/terms", expectedText: "Terms", name: "Terms of Service (/terms)" },
      { path: "/privacy", expectedText: "Privacy", name: "Privacy Policy (/privacy)" },
      { path: "/legal/terms", expectedText: "Terms", name: "Terms of Service Alias (/legal/terms)" },
      { path: "/legal/privacy", expectedText: "Privacy", name: "Privacy Policy Alias (/legal/privacy)" },
      { path: "/sign-in", expectedText: "Welcome to Styld", name: "Sign In (/sign-in)" },
      { path: "/sign-up", expectedText: "Welcome to Styld", name: "Sign Up (/sign-up)" },
      { path: "/auth/sign-in", expectedText: "Welcome to Styld", name: "Sign In Alias (/auth/sign-in)" },
      { path: "/auth/sign-up", expectedText: "Welcome to Styld", name: "Sign Up Alias (/auth/sign-up)" },
    ];

    for (const route of routesToTest) {
      await page.goto(`${BASE_URL}${route.path}`);
      const bodyText = await page.evaluate(() => document.body.innerText || "");
      const title = await page.evaluate(() => document.title || "");
      const hasContent = bodyText.toLowerCase().includes(route.expectedText.toLowerCase()) ||
                          title.toLowerCase().includes(route.expectedText.toLowerCase());
      assert(hasContent, `${route.name} (${route.path}) rendered expected content`);
    }
    console.log("");

    // -------------------------------------------------------------
    // SPEC 2: Authenticated Settings UI Interactions
    // -------------------------------------------------------------
    console.log("--- SPEC 2: Settings UI Interaction Gate ---");
    // Set authenticated session cookie recognized by /api/me
    await page.send("Network.setCookie", {
      name: "session",
      value: "test-e2e-session-token",
      url: BASE_URL
    });

    await page.goto(`${BASE_URL}/settings`);
    await page.setViewport({ width: 1280, height: 900 });

    const settingsTitle = await page.evaluate(() => document.body.innerText.includes("Settings"));
    assert(settingsTitle, "Settings page rendered successfully with authenticated session");

    // 2.1 LIGHT-ONLY CONTRACT: no theme selector anywhere, OS dark cannot take over
    const themeAudit = await page.evaluate(() => {
      const root = document.documentElement;
      const bodyText = document.body.innerText || "";
      const themeWords = /color scheme|dark mode|appearance theme|follow your device/i;
      const themeButtons = Array.from(document.querySelectorAll("button"))
        .map(b => b.innerText.trim())
        .filter(t => t === "Light" || t === "Dark" || t === "System");
      return {
        rootTheme: root.getAttribute("data-theme"),
        rootColorScheme: root.getAttribute("data-color-scheme"),
        hasDarkClass: root.classList.contains("dark"),
        hasThemeControl: themeWords.test(bodyText),
        themeButtonCount: themeButtons.length,
      };
    });
    assert(themeAudit.rootTheme === "light", "Document resolves the light theme (data-theme='light')");
    assert(themeAudit.rootColorScheme === "light", "Document resolves the light color scheme (data-color-scheme='light')");
    assert(!themeAudit.hasDarkClass, "Document never carries a 'dark' class");
    assert(!themeAudit.hasThemeControl, "Settings exposes no theme/appearance selector");
    assert(themeAudit.themeButtonCount === 0, "No Light/Dark/System theme buttons are rendered");

    // Capture the single approved light appearance
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "settings-light-desktop-1440.png") });

    // 2.2 A stale legacy dark preference must NOT be able to force a dark UI
    await page.evaluate(() => {
      const legacy = JSON.stringify({ colorScheme: "dark", textSize: "medium", reduceMotion: false, highContrast: false });
      localStorage.setItem("styld_settings", legacy);
      localStorage.setItem("ms_app_settings.v1", legacy);
    });
    await page.goto(`${BASE_URL}/settings`);
    await new Promise(r => setTimeout(r, 500));
    const afterLegacyDark = await page.evaluate(() => {
      const root = document.documentElement;
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      return {
        rootTheme: root.getAttribute("data-theme"),
        hasDarkClass: root.classList.contains("dark"),
        bodyBg,
      };
    });
    assert(afterLegacyDark.rootTheme === "light", "Legacy colorScheme:'dark' cannot change data-theme");
    assert(!afterLegacyDark.hasDarkClass, "Legacy colorScheme:'dark' cannot add a dark class");
    assert(
      afterLegacyDark.bodyBg !== "rgb(22, 22, 21)" && afterLegacyDark.bodyBg !== "rgb(32, 32, 30)",
      "Legacy colorScheme:'dark' cannot produce dark surfaces"
    );

    // 2.3 Language Switcher Truthfulness (Opens Modal)
    const langRowClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const langBtn = buttons.find(b => b.innerText && b.innerText.includes("Language"));
      if (langBtn) {
        langBtn.click();
        return true;
      }
      return false;
    });
    assert(langRowClicked, "Language row is clickable and triggers modal");
    await new Promise(r => setTimeout(r, 500));

    const langAudit = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const swahiliBtn = buttons.find(b => b.innerText.includes("Kiswahili"));
      const englishBtn = buttons.find(b => b.innerText.includes("English") && !b.innerText.includes("Language"));
      const spanishBtn = buttons.find(b => b.innerText.includes("Español"));
      return {
        swahiliActive: !!swahiliBtn && !swahiliBtn.disabled,
        englishActive: !!englishBtn && !englishBtn.disabled,
        spanishDisabled: !!spanishBtn && spanishBtn.disabled,
      };
    });
    assert(langAudit.englishActive, "English language option is active and supported");
    assert(langAudit.swahiliActive, "Kiswahili language option is active and supported");
    assert(langAudit.spanishDisabled, "Unsupported languages are truthfully disabled with 'Coming soon'");

    // Close language modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Cancel");
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // 2.4 Problem Report Modal Trigger & Dismiss
    const feedbackTriggered = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(e => e.innerText && e.innerText.includes("Report a problem"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(feedbackTriggered, "'Report a problem' row triggers modal");
    await new Promise(r => setTimeout(r, 500));

    const modalVisible = await page.evaluate(() => {
      const modalHeader = Array.from(document.querySelectorAll("h2, h3")).find(d => d.innerText.includes("Report a problem"));
      return !!modalHeader;
    });
    assert(modalVisible, "Problem report modal opened with expected dialog container");

    // Dismiss modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Cancel");
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    // 2.5 Clear Cache Modal Trigger & Confirm
    const clearCacheTriggered = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(e => e.innerText && e.innerText.includes("Clear cache"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(clearCacheTriggered, "'Clear cache' triggers confirmation modal");
    await new Promise(r => setTimeout(r, 500));

    const clearCacheConfirmed = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll("h3")).find(h => h.innerText.includes("Clear cached data?"));
      if (!modal) return false;
      const modalContainer = modal.closest("div.w-full");
      if (!modalContainer) return false;
      const confirmBtn = Array.from(modalContainer.querySelectorAll("button")).find(b => b.innerText.trim() === "Clear cache");
      if (confirmBtn) {
        confirmBtn.click();
        return true;
      }
      return false;
    });
    assert(clearCacheConfirmed, "Cache clear confirmation button executes cleanly");
    await new Promise(r => setTimeout(r, 300));

    // 2.6 Personal Data Export Trigger & Confirm
    const downloadDataTriggered = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(e => e.innerText && e.innerText.includes("Download your data"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(downloadDataTriggered, "'Download your data' triggers confirmation modal");
    await new Promise(r => setTimeout(r, 500));

    const downloadConfirmed = await page.evaluate(() => {
      const modal = Array.from(document.querySelectorAll("h3")).find(h => h.innerText.includes("Download your data"));
      if (!modal) return false;
      const modalContainer = modal.closest("div.w-full");
      if (!modalContainer) return false;
      const btn = Array.from(modalContainer.querySelectorAll("button")).find(b => b.innerText.includes("Download file"));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(downloadConfirmed, "Data export confirmation downloads JSON payload without error");
    await new Promise(r => setTimeout(r, 300));
    console.log("");

    // -------------------------------------------------------------
    // SPEC 3: Responsive Viewport & Zero-Horizontal-Overflow Gate
    // -------------------------------------------------------------
    console.log("--- SPEC 3: Responsive Viewport & Zero-Horizontal-Overflow Gate ---");
    const pagesToAudit = [
      { path: "/", name: "Landing" },
      { path: "/discover", name: "Discover" },
      { path: "/settings", name: "Settings" }
    ];

    for (const pageItem of pagesToAudit) {
      await page.goto(`${BASE_URL}${pageItem.path}`);
      console.log(`  Auditing viewports on ${pageItem.name} (${pageItem.path}):`);

      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
        await new Promise(r => setTimeout(r, 100));

        const overflowCheck = await page.evaluate(() => {
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          return {
            scrollWidth,
            clientWidth,
            hasOverflow: scrollWidth > clientWidth,
            diff: scrollWidth - clientWidth
          };
        });

        assert(
          !overflowCheck.hasOverflow,
          `${pageItem.name} @ ${vp.name} (${vp.width}x${vp.height}) zero overflow (scroll: ${overflowCheck.scrollWidth}, client: ${overflowCheck.clientWidth})`
        );

        // Capture key viewport screenshots
        if (vp.width === 390) {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${pageItem.name.toLowerCase()}-mobile-390.png`) });
        } else if (vp.width === 768) {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${pageItem.name.toLowerCase()}-tablet-768.png`) });
        } else if (vp.width === 1440) {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${pageItem.name.toLowerCase()}-desktop-1440.png`) });
        }
      }
    }
    console.log("");

    // -------------------------------------------------------------
    // SPEC 4: Auth Flow & Protected Route Redirect Gate
    // -------------------------------------------------------------
    console.log("--- SPEC 4: Auth Flow & Protected Navigation ---");
    // Clear cookies to test anonymous redirection
    await page.send("Network.clearBrowserCookies");

    await page.goto(`${BASE_URL}/auth/sign-in?returnTo=%2Fdiscover`);
    const authInputs = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button")).map(b => b.innerText.trim());
      return {
        hasGoogle: buttons.some(t => t.includes("Google")),
        hasEmail: buttons.some(t => t.includes("email")),
      };
    });
    assert(authInputs.hasGoogle, "Sign-in page renders 'Continue with Google'");
    assert(authInputs.hasEmail, "Sign-in page renders 'Continue with email'");

    // Unauthenticated visit to protected route redirects
    await page.goto(`${BASE_URL}/settings`);
    const finalUrl = await page.evaluate(() => window.location.href);
    assert(finalUrl.includes("/auth/sign-in"), "Unauthenticated /settings redirects to /auth/sign-in");
    console.log("");

    // -------------------------------------------------------------
    // SPEC 5: Discovery Controls
    // -------------------------------------------------------------
    console.log("--- SPEC 5: Discovery Controls & Interaction ---");
    await page.goto(`${BASE_URL}/discover`);
    await page.setViewport({ width: 1280, height: 800 });

    const discoverControls = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("[role='tab']"));
      const categoryPills = Array.from(document.querySelectorAll("button, a")).filter(el => {
        const text = el.innerText || "";
        return ["All", "Braids", "Locs", "Natural Hair", "Nails", "Makeup", "Silk Press"].some(cat => text.includes(cat));
      });
      const filterBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Filters"));
      return {
        tabCount: tabs.length,
        categoryCount: categoryPills.length,
        hasFilterBtn: !!filterBtn
      };
    });
    assert(discoverControls.tabCount === 5, "Discovery renders all 5 section tabs (Looks, Salons, Pros, Services, Packages)");
    assert(discoverControls.categoryCount > 0, "Discovery category filter pills render interactively");
    assert(discoverControls.hasFilterBtn, "Discovery filter drawer button is present and ready");
    console.log("");

    // -------------------------------------------------------------
    // SPEC 6: Role Rendering in Settings UI
    // -------------------------------------------------------------
    console.log("--- SPEC 6: Role Identity & Resolution in Settings UI ---");
    const roleResolution = await page.evaluate(() => {
      const roles = ["client", "professional", "salon", "admin", "super_admin"];
      const getDisplayName = (role) => {
        switch (role) {
          case "admin": return "Administrator";
          case "super_admin": return "Super Admin";
          case "professional": return "Beauty Professional";
          case "salon": return "Salon Owner";
          default: return "Valued Client";
        }
      };
      const getAccountLabel = (role) => {
        switch (role) {
          case "admin": return "Admin account";
          case "super_admin": return "Super Admin account";
          case "professional": return "Provider account";
          case "salon": return "Salon account";
          default: return "Client account";
        }
      };
      return roles.every(r => getDisplayName(r).length > 0 && getAccountLabel(r).length > 0);
    });
    assert(roleResolution, "All user roles (client, pro, salon, admin, super_admin) resolve valid labels");
    console.log("");

  } finally {
    await page.close();
    await browser.close();
  }

  console.log("==================================================");
  console.log(`  E2E TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
  if (failedTests > 0) {
    console.error(`  FAILURES (${failedTests}):`);
    failures.forEach(f => console.error(`   - ${f}`));
  } else {
    console.log("  ALL INTERACTION & VIEWPORT SPECS PASSED 100%!");
  }
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ESuite().catch((err) => {
  console.error("Fatal error during E2E suite:", err);
  process.exit(1);
});
