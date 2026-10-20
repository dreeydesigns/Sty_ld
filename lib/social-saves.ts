import { authPool } from "@/lib/auth-database";

const MAX_SAVED_POSTS = 100;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSavedIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && isUuid(item))));
}

export async function readSavedPostIds(workspaceId: string, userId: string) {
  const result = await authPool.query(
    "SELECT profile FROM identity_workspaces WHERE id = $1 AND user_id = $2 AND status = 'active' LIMIT 1",
    [workspaceId, userId],
  );

  if (result.rowCount === 0) {
    return [];
  }

  return normalizeSavedIds(result.rows[0].profile?.savedPostIds);
}

export async function saveSocialPost(workspaceId: string, userId: string, postId: string) {
  if (!isUuid(postId)) {
    throw new Error("Invalid post reference.");
  }

  const client = await authPool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT profile FROM identity_workspaces WHERE id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE",
      [workspaceId, userId],
    );

    if (result.rowCount === 0) {
      throw new Error("Workspace unavailable.");
    }

    const current = normalizeSavedIds(result.rows[0].profile?.savedPostIds);

    if (current.includes(postId)) {
      await client.query("COMMIT");
      return current;
    }

    if (current.length >= MAX_SAVED_POSTS) {
      throw new Error("You can save up to 100 posts.");
    }

    const next = [...current, postId];

    await client.query(
      "UPDATE identity_workspaces SET profile = jsonb_set(profile, '{savedPostIds}', $2::jsonb, true) WHERE id = $1 AND user_id = $3 AND status = 'active'",
      [workspaceId, JSON.stringify(next), userId],
    );

    await client.query("COMMIT");
    return next;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function unsaveSocialPost(workspaceId: string, userId: string, postId: string) {
  if (!isUuid(postId)) {
    throw new Error("Invalid post reference.");
  }

  const client = await authPool.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT profile FROM identity_workspaces WHERE id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE",
      [workspaceId, userId],
    );

    if (result.rowCount === 0) {
      throw new Error("Workspace unavailable.");
    }

    const current = normalizeSavedIds(result.rows[0].profile?.savedPostIds);
    const next = current.filter((id) => id !== postId);

    await client.query(
      "UPDATE identity_workspaces SET profile = jsonb_set(profile, '{savedPostIds}', $2::jsonb, true) WHERE id = $1 AND user_id = $3 AND status = 'active'",
      [workspaceId, JSON.stringify(next), userId],
    );

    await client.query("COMMIT");
    return next;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
