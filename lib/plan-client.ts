import { emptySavedPlan, fieldsFromSaved, type PlanFields, type PlanData, type SavedPlan } from "./plan-v2";

export type PlanSnapshot = {
  identity: string | null; generation: number; data: PlanData | null; draft: PlanFields;
  revision: number; status: "idle" | "loading" | "ready" | "saving" | "saved" | "error" | "conflict";
  dirty: boolean; message: string; remote: SavedPlan | null; loadedQuery: string | null; etag: string | null;
};
const initial = (): PlanSnapshot => ({ identity: null, generation: 0, data: null, draft: fieldsFromSaved(emptySavedPlan()), revision: 0, status: "idle", dirty: false, message: "", remote: null, loadedQuery: null, etag: null });
class PlanSaveError extends Error {}
export function createPlanClient(request: typeof fetch, notify: () => void = () => {}) {
  let state = initial();
  const serverSnapshot = state;
  let change = 0, inFlight = false, readTicket = 0;
  let handoffQuery = "";
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<PlanSnapshot>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
  const matches = (generation: number) => generation === state.generation;

  async function load(query = handoffQuery) {
    if (!state.identity) return;
    handoffQuery = query;
    const generation = state.generation, ticket = ++readTicket;
    if (!state.data) publish({ status: "loading", message: "Loading your plan..." });
    try {
      const response = await request(`/api/plan${query}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!matches(generation) || ticket !== readTicket) return;
      if (response.status === 401 || response.status === 403) { identify(null); publish({ status: "error", message: "Sign in with a client workspace to load your plan." }); return; }
      if (!response.ok || !data?.ok || !data.plan || !Array.isArray(data.services)) throw new Error();
      if (data.scopeKey !== state.identity) { identify(null); publish({ status: "error", message: "Your workspace changed. Reload this page to load its plan." }); return; }
      if (data.plan.revision < Math.max(state.revision, state.remote?.revision ?? 0)) return;
      publish({ etag: response.headers.get("etag") });
      if (state.dirty || inFlight) {
        if (!inFlight && data.plan.revision !== state.revision) publish({ data, loadedQuery: query, status: "conflict", remote: data.plan, message: "Your plan changed elsewhere. Your edits are still here." });
        else publish({ data, loadedQuery: query });
      } else {
        const draft = fieldsFromSaved(data.plan);
        if (state.data && data.plan.revision === state.revision) draft.locationArea = state.draft.locationArea;
        publish({ data, loadedQuery: query, draft, revision: data.plan.revision, status: state.status === "saved" ? "saved" : "ready", message: state.status === "saved" ? "Saved" : "", remote: null });
      }
    } catch {
      if (matches(generation) && ticket === readTicket) publish({ status: "error", message: state.dirty ? "Your plan could not be refreshed. Your edits are still here. Try again." : "Your plan could not be loaded. Try again." });
    }
  }
  function identify(identity: string | null) {
    if (identity === state.identity) return;
    readTicket++; change++; inFlight = false; handoffQuery = "";
    publish({ ...initial(), identity, generation: state.generation + 1 });
  }
  async function save() {
    if (!state.identity || !state.data || !state.etag || !state.dirty || inFlight || state.status === "conflict") return;
    inFlight = true;
    const generation = state.generation, version = change;
    const draft = state.draft, revision = state.revision;
    ++readTicket;
    publish({ status: "saving", message: "Saving plan..." });
    let succeeded = false;
    try {
      const response = await request("/api/plan", { method: "PUT", headers: { "Content-Type": "application/json", "If-Match": state.etag! }, body: JSON.stringify({ expectedRevision: revision, plan: draft }) });
      const payload = await response.json().catch(() => null);
      if (!matches(generation)) return;
      if (response.status === 401 || response.status === 403) { identify(null); publish({ status: "error", message: "Sign in with a client workspace to save your plan." }); return; }
      if (response.status === 412 || ((response.ok || response.status === 409) && payload?.scopeKey !== state.identity)) { identify(null); publish({ status: "error", message: "Your workspace changed. Reload this page before editing its plan." }); return; }
      ++readTicket;
      if (response.ok || response.status === 409) publish({ etag: response.headers.get("etag") });
      if (response.status === 409 && payload?.plan) {
        publish({ status: "conflict", remote: payload.plan, message: "Your plan changed elsewhere. Your edits are still here." });
        return;
      }
      if (!response.ok || !payload?.ok || !payload.plan || !Number.isSafeInteger(payload.plan.revision) || payload.plan.revision <= revision) throw new PlanSaveError(typeof payload?.error === "string" ? payload.error : "Your plan was not saved. Keep this page open and retry when connected.");
      const plan = payload.plan as SavedPlan;
      const stillDirty = change !== version;
      publish({ revision: plan.revision, draft: stillDirty ? state.draft : { ...fieldsFromSaved(plan), locationArea: state.draft.locationArea }, data: { ...state.data!, plan }, dirty: stillDirty,
        status: stillDirty ? "ready" : "saved", message: stillDirty ? "Saving your latest edits..." : "Saved", remote: null });
      succeeded = true;
      notify();
    } catch (error) {
      if (matches(generation)) publish({ status: "error", message: error instanceof PlanSaveError ? error.message : "Your plan was not saved. Keep this page open and retry when connected." });
    } finally {
      if (matches(generation)) {
        inFlight = false;
        if (succeeded && state.dirty) void save();
        else if (succeeded) void load();
      }
    }
  }
  function edit(draft: PlanFields) {
    if (!state.data || state.status === "loading") return;
    change++;
    publish({ draft, dirty: true, message: state.identity ? "Not saved yet" : "This draft stays in this tab.", ...(state.status === "conflict" ? {} : { status: "ready" as const }) });
    if (state.identity) void save();
  }
  function guest(data: PlanData, query = "") {
    if (state.identity) return;
    publish({ data, loadedQuery: query, draft: fieldsFromSaved(data.plan), status: "ready", revision: 0, message: "Sign in with a client workspace to save across devices." });
  }
  async function resolveConflict(keepEdits: boolean) {
    if (!state.remote) return;
    const remote = state.remote;
    change++;
    publish({ revision: remote.revision, data: state.data ? { ...state.data, plan: remote } : null, draft: keepEdits ? state.draft : fieldsFromSaved(remote),
      remote: null, dirty: keepEdits, status: "ready", message: keepEdits ? "Saving your edits against the latest version..." : "Loaded the saved version." });
    if (keepEdits) await save();
    else void load();
  }
  return { getSnapshot: () => state, getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    identify, load, edit, save, guest, resolveConflict };
}
