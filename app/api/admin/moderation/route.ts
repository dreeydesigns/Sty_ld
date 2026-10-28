import { NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth-resolver';
import { authPool } from '@/lib/auth-database';
import { sameOrigin, authError } from '@/lib/api-security';
import {
  approvalServiceEligible,
  checkModerationDecision,
  moderationAuditDetails,
} from '@/lib/moderation';
import { serviceIdFromTags, serviceEligibleForLook, type ServiceRecord } from '@/lib/look-contract';

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { rows } = await authPool.query(
      `SELECT
        id,
        author_workspace_id,
        author_name,
        author_role,
        post_type,
        caption,
        tags,
        publication_status,
        created_at
      FROM social_posts
      WHERE publication_status = 'pending'
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100`,
    );

    const serviceIds = new Set<string>();
    for (const row of rows) {
      const serviceId = serviceIdFromTags(row.tags);
      if (serviceId) serviceIds.add(serviceId);
    }

    const serviceById = new Map<string, ServiceRecord>();
    if (serviceIds.size > 0) {
      const services = await authPool.query(
        `SELECT id, workspace_id, is_active FROM services WHERE id = ANY($1::uuid[])`,
        [[...serviceIds]],
      );
      for (const service of services.rows as ServiceRecord[]) serviceById.set(service.id, service);
    }

    const posts = rows.map((row: {
      id: string;
      author_name: string;
      author_role: string;
      post_type: string;
      caption: string;
      tags: string[];
      publication_status: string;
      created_at: string;
      author_workspace_id: string;
    }) => {
      const serviceId = serviceIdFromTags(row.tags);
      const service = serviceId ? serviceById.get(serviceId) : undefined;
      return {
        id: row.id,
        author_name: row.author_name,
        author_role: row.author_role,
        post_type: row.post_type,
        caption: row.caption,
        publication_status: row.publication_status,
        created_at: row.created_at,
        serviceCheck: serviceId
          ? serviceEligibleForLook(service ?? null, row.author_workspace_id)
            ? 'eligible'
            : 'ineligible'
          : null,
      };
    });

    return NextResponse.json({ posts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  let resultingStatus: 'published' | 'rejected' | null = null;
  let decidedPostId: string | null = null;
  try {
    sameOrigin(request);
    const actor = await requireAdmin();

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AuthError('Invalid moderation request.', 400);
    }
    const postId = typeof body.postId === 'string' ? body.postId : '';
    if (!isUuid(postId)) {
      throw new AuthError('Post not found.', 404);
    }

    const client = await authPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SET LOCAL idle_in_transaction_session_timeout = '5s'");
      const { rows } = await client.query(
        `SELECT
          id,
          author_user_id,
          author_workspace_id,
          author_role,
          tags,
          visibility,
          publication_status,
          moderation_status,
          deleted_at
        FROM social_posts
        WHERE id = $1
        FOR UPDATE`,
        [postId],
      );

      const check = checkModerationDecision({
        actor: { userId: actor.userId, admin: actor.admin, mfaVerified: actor.mfaVerified },
        post: rows[0] ?? null,
        decision: body.decision,
        reason: body.reason,
      });
      if (!check.ok) {
        throw new AuthError(check.error, check.status);
      }

      if (check.resultingStatus === 'published' && check.serviceId) {
        const serviceResult = await client.query(
          `SELECT id, workspace_id, is_active FROM services WHERE id = $1`,
          [check.serviceId],
        );
        const service = (serviceResult.rows[0] as ServiceRecord) ?? null;
        if (!approvalServiceEligible(rows[0], check.serviceId, service)) {
          throw new AuthError('The service reference for this Look is no longer eligible.', 409);
        }
      }

      const updated = await client.query(
        `UPDATE social_posts
        SET publication_status = $2, updated_at = now()
        WHERE id = $1
          AND publication_status = 'pending'
          AND moderation_status = 'visible'
          AND deleted_at IS NULL
        RETURNING id, publication_status`,
        [postId, check.resultingStatus],
      );
      if (!updated.rowCount) {
        throw new AuthError('This post is no longer awaiting review.', 409);
      }
      // What the row now holds, read out of the UPDATE's own RETURNING clause. The answer a
      // reviewer gets has to come from the database, not from echoing the value that was asked for.
      const storedStatus = updated.rows[0]?.publication_status;
      if (storedStatus !== 'published' && storedStatus !== 'rejected') {
        throw new AuthError('The review could not be recorded.', 500);
      }

      await client.query(
        `INSERT INTO security_events (user_id, event, details)
        VALUES ($1, $2, $3)`,
        [
          actor.userId,
          check.decision === 'approve' ? 'moderation_approve' : 'moderation_reject',
          JSON.stringify(
            moderationAuditDetails({
              post: rows[0],
              decision: check.decision,
              previousStatus: 'pending',
              resultingStatus: storedStatus,
              reason: check.reason,
              serviceId: check.serviceId,
            }),
          ),
        ],
      );
      await client.query('COMMIT');
      resultingStatus = storedStatus;
      decidedPostId = postId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, postId: decidedPostId, resultingStatus });
  } catch (error) {
    return authError(error);
  }
}
