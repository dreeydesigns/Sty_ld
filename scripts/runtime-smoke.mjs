const baseUrl = process.argv[2] || "http://localhost:3000";
const viewports = [
  { name: "plan", path: "/", marker: "PLANNING" },
  { name: "discover", path: "/", marker: "DISCOVER" },
  { name: "discover-search", path: "/discover?tab=looks&q=braids", marker: "BRAIDS" },
  { name: "professionals", path: "/professionals/faith-odhiambo", marker: "FAITH" },
  { name: "salons", path: "/salons/kilimani-texture-house", marker: "TEXTURE" },
  { name: "comparison", path: "/service-comparison", marker: "COMPARISON" },
  { name: "plan", path: "/book", marker: "PLANNING" },
  { name: "account-hub", path: "/account", marker: "ACCOUNT" },
  { name: "notifications", path: "/notifications", marker: "NOTIFICATIONS" },
  { name: "settings", path: "/settings", marker: "SETTINGS" },
  { name: "activity", path: "/activity", marker: "ACTIVITY" },
  { name: "onboarding-client", path: "/onboarding/client", marker: "ONBOARDING" },
  { name: "onboarding-professional", path: "/onboarding/professional", marker: "PROFESSIONAL" },
  { name: "onboarding-salon", path: "/onboarding/salon", marker: "SALON" },
  { name: "signin", path: "/auth/sign-in", marker: "SIGNIN" },
  { name: "signup", path: "/auth/sign-up", marker: "SIGNUP" },
];
let failures = 0;
for (const route of viewports) {
  const target = await (await fetch("http://127.0.0.1:9222/json/new?" + new URL(route.path, baseUrl).href, { method: "PUT" })).json();
  const ws = new global.WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const exceptions = [];
  function send(m, p) { return new Promise((resolve) => { const n=++id; function h(raw){const d=JSON.parse(raw.data);if (d.id!==n)return;ws.removeEventListener("message",h);resolve(d.result)} ws.addEventListener("message",h); ws.send(JSON.stringify({ id:n, method:m, params:p })); }); }
  ws.addEventListener("message", (raw) => { const d=JSON.parse(raw.data); if (d.method === "Runtime.exceptionThrown") exceptions.push(d.params.exceptionDetails.text); });
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  await send("Runtime.enable", {});
  await send("Page.enable", {});
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true, fitWindow: false });
  await send("Page.navigate", { url: new URL(route.path, baseUrl).href });
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const textResult = await send("Runtime.evaluate", { expression: "document.body ? document.body.innerText.toUpperCase() : ''", returnByValue: true });
  const bodyText = textResult.result.value || "";
  const markerVisible = bodyText.includes(route.marker);
  ws.close();
  const ok = exceptions.length === 0 && (route.marker === "" || markerVisible);
  failures += ok ? 0 : 1;
  console.log((ok ? "PASS" : "FAIL") + ": " + route.name + " -> exceptions=" + exceptions.length + ", marker=" + (route.marker ? markerVisible : "n/a"));
  if (!ok && exceptions.length) console.log("  exception: " + exceptions[0]);
}
process.exit(failures ? 1 : 0);
