export function validBookingDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  return value >= today;
}

export function validBookingTime(value: unknown): value is string {
  return typeof value === 'string' && (/^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(value) || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value));
}
