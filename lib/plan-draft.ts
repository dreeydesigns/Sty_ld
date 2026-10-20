import { MAX_PLAN_SERVICES } from "./plan-offer.cjs";
import { sanitizePlanContext } from "./plan-context.cjs";

export const PLAN_DRAFT_VERSION = 1;
export const PLAN_DRAFT_STORAGE_KEY = "styld.plan.draft.v1";
export const MAX_PLAN_DRAFT_CONTEXTS = 6;

export type PlanDraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PlanDraftSelection = {
  serviceIds: string[];
  source: "url" | "draft" | "none";
};

type StoredDraft = { serviceIds: string[]; updatedAt: number };
type StoredScopes = Record<string, Record<string, StoredDraft>>;
type StoredRecord = { version: number; scopes: StoredScopes };

const CONTEXT_KEY_PATTERN = /^(general|provider:(professionals|salons):[a-z0-9-]{1,60})$/i;
const SERVICE_ID_PATTERN = /^[a-z0-9-]+$/i;
const MAX_SERVICE_ID_LENGTH = 60;
const MAX_SCOPE_LENGTH = 200;

function resolveStorage(storage?: PlanDraftStorage | null): PlanDraftStorage | null {
  if (storage) return storage;
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function sanitizeDraftServiceIds(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const ids: string[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!SERVICE_ID_PATTERN.test(id) || id.length > MAX_SERVICE_ID_LENGTH) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= MAX_PLAN_SERVICES) break;
  }

  return ids;
}

export function planContextKey(context: {
  mode?: string | null;
  targetType?: string | null;
  targetId?: string | null;
} | null | undefined): string {
  if (
    context?.mode === "provider" &&
    (context.targetType === "professionals" || context.targetType === "salons") &&
    typeof context.targetId === "string" &&
    SERVICE_ID_PATTERN.test(context.targetId) &&
    context.targetId.length <= MAX_SERVICE_ID_LENGTH
  ) {
    return `provider:${context.targetType}:${context.targetId}`;
  }

  return "general";
}

export function planDraftScope(
  session: { id?: string | null; role?: string | null; workspaceId?: string | null } | null | undefined,
  sessionResolved = true,
): string | null {
  if (session && typeof session.id === "string" && session.id.length > 0 && session.role !== "guest") {
    const workspace = typeof session.workspaceId === "string" && session.workspaceId.length > 0
      ? session.workspaceId
      : "default";
    return `user:${session.id}:${workspace}`.slice(0, MAX_SCOPE_LENGTH);
  }

  if (session || sessionResolved) return "guest";
  return null;
}

function readRecord(storage?: PlanDraftStorage | null): StoredRecord | null {
  const target = resolveStorage(storage);
  if (!target) return null;

  try {
    const raw = target.getItem(PLAN_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredRecord> | null;
    if (!parsed || typeof parsed !== "object" || parsed.version !== PLAN_DRAFT_VERSION) return null;
    if (!parsed.scopes || typeof parsed.scopes !== "object" || Array.isArray(parsed.scopes)) return null;

    const scopes: StoredScopes = {};
    for (const [scope, contexts] of Object.entries(parsed.scopes)) {
      if (typeof scope !== "string" || scope.length === 0 || scope.length > MAX_SCOPE_LENGTH) continue;
      if (!contexts || typeof contexts !== "object" || Array.isArray(contexts)) continue;

      const safeContexts: Record<string, StoredDraft> = {};
      for (const [key, draft] of Object.entries(contexts)) {
        if (!CONTEXT_KEY_PATTERN.test(key)) continue;
        const serviceIds = sanitizeDraftServiceIds((draft as StoredDraft | null)?.serviceIds);
        if (!serviceIds.length) continue;
        const updatedAt = Number((draft as StoredDraft | null)?.updatedAt);
        safeContexts[key] = { serviceIds, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 };
      }

      if (Object.keys(safeContexts).length) scopes[scope] = safeContexts;
    }

    return { version: PLAN_DRAFT_VERSION, scopes };
  } catch {
    return null;
  }
}

function writeRecord(record: StoredRecord, storage?: PlanDraftStorage | null) {
  const target = resolveStorage(storage);
  if (!target) return;

  try {
    if (Object.keys(record.scopes).length === 0) target.removeItem(PLAN_DRAFT_STORAGE_KEY);
    else target.setItem(PLAN_DRAFT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage can be unavailable or full. A draft is best effort only.
  }
}

export function readPlanDraft(
  scope: string | null | undefined,
  contextKey: string,
  storage?: PlanDraftStorage | null,
): string[] | null {
  if (!scope || !CONTEXT_KEY_PATTERN.test(contextKey)) return null;
  const ids = readRecord(storage)?.scopes?.[scope]?.[contextKey]?.serviceIds;
  return ids?.length ? [...ids] : null;
}

export function writePlanDraft(
  scope: string | null | undefined,
  contextKey: string,
  serviceIds: unknown,
  storage?: PlanDraftStorage | null,
  now = Date.now(),
): string[] {
  const ids = sanitizeDraftServiceIds(serviceIds);
  const target = resolveStorage(storage);
  if (!scope || !CONTEXT_KEY_PATTERN.test(contextKey) || !target) return ids;

  const record = readRecord(target) ?? { version: PLAN_DRAFT_VERSION, scopes: {} };
  const scopeDrafts = { ...(record.scopes[scope] ?? {}) };

  if (ids.length) scopeDrafts[contextKey] = { serviceIds: ids, updatedAt: now };
  else delete scopeDrafts[contextKey];

  const scopes = { ...record.scopes };
  const pruned = Object.entries(scopeDrafts)
    .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
    .slice(0, MAX_PLAN_DRAFT_CONTEXTS);

  if (pruned.length) scopes[scope] = Object.fromEntries(pruned);
  else delete scopes[scope];

  writeRecord({ version: PLAN_DRAFT_VERSION, scopes }, target);
  return ids;
}

export function clearPlanDraft(
  scope: string | null | undefined,
  contextKey: string,
  storage?: PlanDraftStorage | null,
): void {
  if (!scope || !CONTEXT_KEY_PATTERN.test(contextKey)) return;
  const target = resolveStorage(storage);
  if (!target) return;

  const record = readRecord(target);
  if (!record?.scopes[scope]) return;

  const scopeDrafts = { ...record.scopes[scope] };
  delete scopeDrafts[contextKey];

  const scopes = { ...record.scopes };
  if (Object.keys(scopeDrafts).length) scopes[scope] = scopeDrafts;
  else delete scopes[scope];

  writeRecord({ version: PLAN_DRAFT_VERSION, scopes }, target);
}

export function clearPlanScope(scope: string | null | undefined, storage?: PlanDraftStorage | null): void {
  if (!scope) return;
  const record = readRecord(storage);
  if (!record?.scopes[scope]) return;

  const scopes = { ...record.scopes };
  delete scopes[scope];
  writeRecord({ version: PLAN_DRAFT_VERSION, scopes }, storage);
}

export function choosePlanServiceIds(input: {
  explicit: boolean;
  explicitIds?: unknown;
  draftIds?: unknown;
  allowedIds: Iterable<string>;
  allowDraft: boolean;
}): PlanDraftSelection {
  const allowed = new Set(input.allowedIds);
  const filterAllowed = (value: unknown) =>
    sanitizeDraftServiceIds(value).filter((id) => allowed.has(id));

  if (input.explicit) {
    return { serviceIds: filterAllowed(input.explicitIds), source: "url" };
  }

  if (input.allowDraft) {
    const serviceIds = filterAllowed(input.draftIds);
    if (serviceIds.length) return { serviceIds, source: "draft" };
  }

  return { serviceIds: [], source: "none" };
}

export function buildPlanHref(input: {
  serviceIds?: unknown;
  targetType?: unknown;
  targetId?: unknown;
}): string {
  const context = sanitizePlanContext({
    targetType: input.targetType,
    targetId: input.targetId,
  }) as { mode: string; targetType: string | null; targetId: string | null };
  const params = new URLSearchParams();

  if (context.mode === "provider" && context.targetType && context.targetId) {
    params.set("targetType", context.targetType);
    params.set("targetId", context.targetId);
  }

  const serviceIds = sanitizeDraftServiceIds(input.serviceIds);
  if (serviceIds.length) params.set("serviceIds", serviceIds.join(","));

  const query = params.toString();
  return query ? `/book?${query}` : "/book";
}
