-- Closes the schema drift Better Auth reports on every boot: its model declares these
-- four users columns required while the restored database leaves them nullable, so an
-- existing row can still hold a null and the auth layer cannot trust its own reads.
--
-- This migration enforces the constraint, and it refuses to invent the missing value.
-- A null email cannot be backfilled truthfully (it is the sign-in identity), and a null
-- created_at or updated_at cannot be backfilled without writing a false history. Any row
-- in that condition stops the migration with a count so a human decides what the row is.
--
-- Drafted and tested on a disposable database only. Do not apply to a persistent
-- environment without a separate founder approval.
--
-- Run it with ON_ERROR_STOP=1, or as psql --single-transaction. A refused guard leaves
-- the session inside an aborted transaction, so a client that carries on reports a
-- confusing second error instead of the count this migration raised.

BEGIN;

-- The guards and the alterations below name the users table without a schema, so pin the one
-- this project creates its tables in rather than trusting whatever search_path the runner has.
SET LOCAL search_path = public;

-- Nothing may be signed in without an email in an email-OTP product.
DO $$
DECLARE
  missing_email integer;
BEGIN
  SELECT count(*) INTO missing_email FROM users WHERE email IS NULL OR btrim(email) = '';
  IF missing_email > 0 THEN
    RAISE EXCEPTION
      'users rows without a usable email must be resolved first: %',
      missing_email
      USING HINT = 'Confirm each account is real, set its email, or delete it. STYLD will not invent one.';
  END IF;
END $$;

DO $$
DECLARE
  missing_stamp integer;
BEGIN
  SELECT count(*) INTO missing_stamp FROM users WHERE created_at IS NULL OR updated_at IS NULL;
  IF missing_stamp > 0 THEN
    RAISE EXCEPTION
      'users rows without a real timestamp must be resolved first: %',
      missing_stamp
      USING HINT = 'Recover the timestamp from a trusted record or accept a documented unknown. Do not default it to now().';
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- NOT NULL alone still admits a blank string, which is no identity either. The guard above reads
-- the data once; this keeps future inserts from drifting back into the same condition.
ALTER TABLE users ADD CONSTRAINT users_email_not_blank CHECK (btrim(email) <> '');

-- A null verification flag is not unknown, it is unverified, so false is the truthful value.
UPDATE users SET email_verified = false WHERE email_verified IS NULL;
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- Future rows cannot drift back: the columns carry their defaults at insert time.
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();
-- A default only fills a value the insert omitted; on its own it still admits a null.
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

COMMIT;
