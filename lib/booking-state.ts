/**
 * Styld Server-Authoritative Booking State Machine
 *
 * Implements strict, bi-directional marketplace transitions between
 * clients, beauty professionals, salons, and admin operations.
 *
 * Explicitly separates Booking Status, Payment Status, and Payout Status.
 */

export type BookingStatus =
  | 'draft'
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'reschedule_requested'; // transitional client request

export type PaymentStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type PayoutStatus =
  | 'pending'
  | 'eligible'
  | 'processing'
  | 'paid'
  | 'failed';

export type ActorRole = 'client' | 'professional' | 'salon' | 'admin' | 'super_admin';

/**
 * Normalizes legacy booking statuses ('pending' -> 'requested', 'confirmed' -> 'accepted')
 */
export function normalizeBookingStatus(status?: string | null): BookingStatus {
  if (!status) return 'requested';
  const clean = status.toLowerCase().trim();
  if (clean === 'pending') return 'requested';
  if (clean === 'confirmed') return 'accepted';
  return clean as BookingStatus;
}

/**
 * Allowable status transitions map
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['scheduled', 'in_progress', 'cancelled', 'reschedule_requested'],
  scheduled: ['in_progress', 'cancelled', 'reschedule_requested'],
  in_progress: ['completed', 'disputed'],
  completed: ['disputed'],
  reschedule_requested: ['accepted', 'declined', 'cancelled'],
  declined: [],
  cancelled: [],
  disputed: ['completed', 'cancelled'],
};

/**
 * Permissions required per target status
 */
export function isRoleAuthorizedForTransition(
  actorRole: ActorRole,
  targetStatus: BookingStatus
): boolean {
  if (actorRole === 'admin' || actorRole === 'super_admin') {
    return true;
  }

  switch (targetStatus) {
    case 'accepted':
    case 'declined':
    case 'scheduled':
    case 'in_progress':
      return actorRole === 'professional' || actorRole === 'salon';

    case 'cancelled':
    case 'reschedule_requested':
      return actorRole === 'client' || actorRole === 'professional' || actorRole === 'salon';

    case 'completed':
      // Both provider and client can confirm completion
      return true;

    case 'disputed':
      return actorRole === 'client' || actorRole === 'professional' || actorRole === 'salon';

    default:
      return false;
  }
}

/**
 * Validates whether a booking state transition is valid according to marketplace rules.
 */
export function validateBookingTransition(
  currentRaw: string,
  targetRaw: string,
  actorRole: ActorRole
): { valid: boolean; error?: string } {
  const current = normalizeBookingStatus(currentRaw);
  const target = normalizeBookingStatus(targetRaw);

  if (current === target) {
    return { valid: true };
  }

  const allowedNext = ALLOWED_TRANSITIONS[current] || [];
  if (!allowedNext.includes(target)) {
    return {
      valid: false,
      error: `Cannot transition booking from '${current}' to '${target}'.`,
    };
  }

  if (!isRoleAuthorizedForTransition(actorRole, target)) {
    return {
      valid: false,
      error: `Role '${actorRole}' is not authorized to transition booking to '${target}'.`,
    };
  }

  return { valid: true };
}
