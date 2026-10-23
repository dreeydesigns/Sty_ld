export type SavesSnapshot = {
  identity: string | null;
  generation: number;
  ids: string[];
  status: "idle" | "loading" | "ready" | "error";
  pending: boolean;
  target: string | null;
  message: string;
  undo: { postId: string; saved: boolean } | null;
};

const empty: SavesSnapshot = {
  identity: null, generation: 0, ids: [], status: "idle", pending: false, target: null, message: "", undo: null,
};

class SavesError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Browser memory only. The existing server collection remains the source of truth.
export function createPrivateSaves(request: typeof fetch) {
  let state = empty;
  let revision = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<SavesSnapshot>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const current = (generation: number, identity: string | null) =>
    state.generation === generation && state.identity === identity;

  async function readIds(response: Response) {
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true || !Array.isArray(payload.savedPostIds) ||
      !payload.savedPostIds.every((id: unknown) => typeof id === "string")) {
      throw new SavesError(response.status === 401 ? "Sign in to save looks." :
        response.status === 403 ? "Switch to a client workspace to save looks." : "Your saves could not be updated. Try again.", response.status);
    }
    return [...new Set<string>(payload.savedPostIds)];
  }

  async function refresh() {
    if (!state.identity || state.pending || state.status === "loading") return;
    const { generation, identity } = state;
    const ticket = ++revision;
    publish({ status: "loading", message: "" });
    try {
      const response = await request("/api/social/saves", { cache: "no-store" });
      const ids = await readIds(response);
      if (current(generation, identity) && ticket === revision) publish({ ids, status: "ready" });
    } catch (error) {
      if (current(generation, identity) && ticket === revision) {
        publish({ ids: [], status: "error", undo: null, message: error instanceof Error ? error.message : "Your saves could not be loaded. Try again." });
      }
    }
  }

  function identify(identity: string | null) {
    if (identity === state.identity) return;
    revision++;
    publish({ ...empty, identity, generation: state.generation + 1 });
    if (identity) void refresh();
  }

  async function change(postId: string, saved: boolean) {
    if (!state.identity || state.status !== "ready" || state.pending || state.ids.includes(postId) === saved) return false;
    const { generation, identity, ids: previous, undo: previousUndo } = state;
    ++revision;
    publish({ ids: saved ? [...previous, postId] : previous.filter((id) => id !== postId), pending: true, target: postId,
      message: saved ? "Saving look..." : "Removing look...", undo: null });
    try {
      const response = await request(saved ? "/api/social/saves" : `/api/social/saves/${encodeURIComponent(postId)}`, saved ? {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }),
      } : { method: "DELETE" });
      const ids = await readIds(response);
      if (!current(generation, identity)) return false;
      publish({ ids, pending: false, undo: { postId, saved: !saved }, message: saved ? "Look saved." : "Look removed from saves." });
      return true;
    } catch (error) {
      if (current(generation, identity)) {
        const denied = error instanceof SavesError && (error.status === 401 || error.status === 403);
        publish({ ids: denied ? [] : previous, status: denied ? "error" : "ready", pending: false, undo: denied ? null : previousUndo,
          message: error instanceof SavesError ? error.message : "Your saves could not be updated. Try again." });
      }
      return false;
    }
  }

  return {
    getSnapshot: () => state,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    identify, refresh, change,
    async undo() {
      const action = state.undo;
      if (action && await change(action.postId, action.saved)) publish({ undo: null });
    },
  };
}
