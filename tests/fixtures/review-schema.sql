-- Schema-only export from styld-idea003-integration-qa.
-- Restored only into new project styld-build1-review-db, database styld_review.
-- No application records, role credentials, ownership grants or sequence current values are included.
-- Source contains no custom functions, triggers, policies or views.

CREATE SEQUENCE public.auth_audit_log_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.security_events_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE public.admin_account_config (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, is_universal_admin boolean DEFAULT false, can_assume_roles boolean DEFAULT false, description character varying(500), created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.analytics_events (id uuid DEFAULT gen_random_uuid() NOT NULL, event_name character varying(100) NOT NULL, user_id uuid, anonymous_id character varying(100), role character varying(30), market character varying(30) DEFAULT 'nairobi'::character varying, properties jsonb DEFAULT '{}'::jsonb, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.auth_accounts (id uuid DEFAULT gen_random_uuid() NOT NULL, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" uuid NOT NULL, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp with time zone, "refreshTokenExpiresAt" timestamp with time zone, scope text, password text, "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamp with time zone NOT NULL);

CREATE TABLE public.auth_audit_log (id bigint DEFAULT nextval('auth_audit_log_id_seq'::regclass) NOT NULL, user_id text, clerk_user_id text, auth_source text, auth_method text NOT NULL, device_fingerprint text, ip_address_hash text, user_agent text, platform text, language text, timezone text, screen text, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.auth_browsers (user_id uuid NOT NULL, browser_hash text NOT NULL, last_seen_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.auth_limits (id uuid DEFAULT gen_random_uuid() NOT NULL, key text NOT NULL, count integer NOT NULL, "lastRequest" bigint NOT NULL);

CREATE TABLE public.auth_rate_limits (key text NOT NULL, count integer NOT NULL, window_start timestamp with time zone NOT NULL, last_attempt timestamp with time zone NOT NULL);

CREATE TABLE public.auth_recovery_codes (user_id uuid NOT NULL, code_hash text NOT NULL);

CREATE TABLE public.auth_session_context (session_id text NOT NULL, user_id uuid NOT NULL, active_role text DEFAULT 'client'::text NOT NULL, mfa_verified_at timestamp with time zone, last_totp_step bigint, workspace_id uuid);

CREATE TABLE public.auth_sessions (id uuid DEFAULT gen_random_uuid() NOT NULL, "expiresAt" timestamp with time zone NOT NULL, token text NOT NULL, "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamp with time zone NOT NULL, "ipAddress" text, "userAgent" text, "userId" uuid NOT NULL);

CREATE TABLE public.auth_totp (user_id uuid NOT NULL, encrypted_secret text NOT NULL, enabled boolean DEFAULT false NOT NULL, last_step bigint DEFAULT '-1'::integer NOT NULL);

CREATE TABLE public.auth_verifications (id uuid DEFAULT gen_random_uuid() NOT NULL, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamp with time zone NOT NULL, "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL);

CREATE TABLE public.bookings (id uuid DEFAULT gen_random_uuid() NOT NULL, client_id uuid NOT NULL, service_id uuid, provider_id uuid, service_names text[], provider_slug text, provider_name text, target_type text, booking_date date NOT NULL, booking_time time without time zone NOT NULL, total_kes integer, total_price numeric(10,2), status character varying(30) DEFAULT 'pending'::character varying, notes text, local_id text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), payment_status character varying(30) DEFAULT 'pending'::character varying, service_mode character varying(50) DEFAULT 'salon'::character varying, client_notes text, provider_notes text, cancelled_by uuid, cancellation_reason text, status_history jsonb DEFAULT '[]'::jsonb, idempotency_key character varying(100), provider_workspace_id uuid);

CREATE TABLE public.comments (id uuid DEFAULT gen_random_uuid() NOT NULL, post_id uuid NOT NULL, author_id uuid NOT NULL, text text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.contact_messages (id uuid DEFAULT gen_random_uuid() NOT NULL, name text NOT NULL, email text, phone text, subject text, message text NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.email_auth_challenges (token_hash text NOT NULL, email character varying(255) NOT NULL, code_hash text NOT NULL, magic_link_hash text, expires_at timestamp with time zone NOT NULL, attempts integer DEFAULT 0 NOT NULL, verified_at timestamp with time zone, consumed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.follows (follower_id uuid NOT NULL, following_id uuid NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.identity_workspaces (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, role text NOT NULL, status text DEFAULT 'active'::text NOT NULL, profile jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.mfa_methods (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, type character varying(32) DEFAULT 'totp'::character varying NOT NULL, secret_encrypted text NOT NULL, verified_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.passkey_challenges (challenge_hash text NOT NULL, user_id uuid, type character varying(32) NOT NULL, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.passkey_credentials (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, credential_id text NOT NULL, public_key text NOT NULL, counter bigint DEFAULT 0 NOT NULL, device_name character varying(100), backed_up boolean DEFAULT false, transports text[], created_at timestamp with time zone DEFAULT now(), last_used_at timestamp with time zone);

CREATE TABLE public.payment_logs (id uuid DEFAULT gen_random_uuid() NOT NULL, booking_id uuid, user_id uuid, amount numeric(10,2) NOT NULL, currency character varying(10) DEFAULT 'KES'::character varying, provider character varying(30) NOT NULL, reference character varying(100), merchant_request_id character varying(100), checkout_request_id character varying(100), transaction_id character varying(100), receipt_number character varying(100), status character varying(30) DEFAULT 'pending'::character varying NOT NULL, phone character varying(50), raw_callback jsonb, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.posts (id uuid DEFAULT gen_random_uuid() NOT NULL, author_id uuid NOT NULL, type character varying(20) DEFAULT 'portfolio'::character varying NOT NULL, caption text DEFAULT ''::text NOT NULL, tags text[] DEFAULT '{}'::text[] NOT NULL, images text[] DEFAULT '{}'::text[] NOT NULL, location character varying(200), likes integer DEFAULT 0 NOT NULL, share_count integer DEFAULT 0 NOT NULL, saved_by text[] DEFAULT '{}'::text[] NOT NULL, bookmarked_by text[] DEFAULT '{}'::text[] NOT NULL, reposted_by text[] DEFAULT '{}'::text[] NOT NULL, archived boolean DEFAULT false NOT NULL, deleted boolean DEFAULT false NOT NULL, deleted_at timestamp with time zone, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.recovery_codes (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, code_hash text NOT NULL, consumed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.reviews (id uuid DEFAULT gen_random_uuid() NOT NULL, booking_id uuid NOT NULL, client_id uuid NOT NULL, provider_id uuid, provider_slug character varying(200), rating integer NOT NULL, comment text, is_verified boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.salon_memberships (salon_id uuid NOT NULL, user_id uuid NOT NULL, permission text NOT NULL);

CREATE TABLE public.salon_workspaces (id uuid DEFAULT gen_random_uuid() NOT NULL, owner_id uuid NOT NULL, name text NOT NULL);

CREATE TABLE public.security_events (id bigint DEFAULT nextval('security_events_id_seq'::regclass) NOT NULL, user_id uuid, event text NOT NULL, ip_hash text, user_agent text, details jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.services (id uuid DEFAULT gen_random_uuid() NOT NULL, provider_id uuid NOT NULL, name character varying(100) NOT NULL, description text, price numeric(10,2) NOT NULL, duration_minutes integer, image_url character varying(500), category character varying(50), is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), workspace_id uuid);

CREATE TABLE public.sessions (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, token_hash character varying(255) NOT NULL, device_name character varying(100), browser character varying(200), ip_address character varying(50), is_current boolean DEFAULT false, assumed_role character varying(20), created_at timestamp with time zone DEFAULT now(), last_active_at timestamp with time zone DEFAULT now());

CREATE TABLE public.social_posts (id uuid DEFAULT gen_random_uuid() NOT NULL, author_user_id uuid NOT NULL, author_workspace_id uuid NOT NULL, author_name text NOT NULL, author_slug text, author_role text NOT NULL, post_type text NOT NULL, caption text NOT NULL, tags text[] DEFAULT '{}'::text[] NOT NULL, media_urls text[] DEFAULT '{}'::text[] NOT NULL, visibility text DEFAULT 'public'::text NOT NULL, publication_status text DEFAULT 'pending'::text NOT NULL, moderation_status text DEFAULT 'visible'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone);

CREATE TABLE public.stories (id uuid DEFAULT gen_random_uuid() NOT NULL, author_id uuid NOT NULL, image_url text NOT NULL, caption text, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.user_blocks (blocker_id uuid NOT NULL, blocked_id uuid NOT NULL, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.user_identities (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, provider character varying(32) NOT NULL, provider_subject character varying(255) NOT NULL, email character varying(255), phone character varying(20), verified_at timestamp with time zone, last_used_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.user_reports (id uuid DEFAULT gen_random_uuid() NOT NULL, reporter_id uuid NOT NULL, target_type character varying(50) NOT NULL, target_id character varying(100) NOT NULL, reason character varying(100) NOT NULL, notes text, severity character varying(20) DEFAULT 'normal'::character varying, status character varying(20) DEFAULT 'pending'::character varying, resolved_by uuid, resolved_at timestamp with time zone, created_at timestamp with time zone DEFAULT now());

CREATE TABLE public.user_roles (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, role character varying(20) NOT NULL, assigned_at timestamp with time zone DEFAULT now(), assigned_by_admin boolean DEFAULT false);

CREATE TABLE public.user_settings (user_id uuid NOT NULL, color_scheme character varying(10) DEFAULT 'system'::character varying, text_size character varying(10) DEFAULT 'medium'::character varying, reduce_motion boolean DEFAULT false, high_contrast boolean DEFAULT false, push_notifications boolean DEFAULT true, private_account boolean DEFAULT false, show_activity_status boolean DEFAULT true, allow_direct_messages boolean DEFAULT true, updated_at timestamp with time zone DEFAULT now());

CREATE TABLE public.users (id uuid DEFAULT gen_random_uuid() NOT NULL, phone character varying(20), first_name character varying(100) NOT NULL, last_name character varying(100), email character varying(255), password_hash character varying(255), phone_verified boolean DEFAULT false, email_verified boolean DEFAULT false, role character varying(20) DEFAULT 'client'::character varying, profile_image_url character varying(500), cover_image_url character varying(500), bio text, display_name character varying(150), salon_name character varying(150), location character varying(200), theme character varying(50), tribe_badge character varying(10), is_universal_admin boolean DEFAULT false, passcode character varying(255), terms_accepted_at timestamp with time zone, terms_version character varying(30), firebase_uid text, deletion_status character varying(20) DEFAULT 'active'::character varying, deletion_requested_at timestamp with time zone, username text, specialty text, service_mode text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), identity_verified boolean DEFAULT false, provider_verified boolean DEFAULT false, salon_verified boolean DEFAULT false, verification_status character varying(20) DEFAULT 'not_started'::character varying, verification_notes text, verified_at timestamp with time zone, totp_enabled boolean DEFAULT false, passkey_enabled boolean DEFAULT false, clerk_user_id character varying(255), auth_suspended boolean DEFAULT false NOT NULL, suspended boolean DEFAULT false NOT NULL, last_workspace_id uuid);

CREATE TABLE public.whatsapp_auth_challenges (token_hash text NOT NULL, phone character varying(20) NOT NULL, verification_sid character varying(100) NOT NULL, expires_at timestamp with time zone NOT NULL, attempts integer DEFAULT 0 NOT NULL, verified_at timestamp with time zone, consumed_at timestamp with time zone);

CREATE TABLE public.workspace_applications (user_id uuid NOT NULL, role text NOT NULL, name text NOT NULL, description text NOT NULL, contact text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, reviewed_by uuid, created_at timestamp with time zone DEFAULT now());

ALTER TABLE public.admin_account_config ADD CONSTRAINT admin_account_config_pkey PRIMARY KEY (id);

ALTER TABLE public.admin_account_config ADD CONSTRAINT admin_account_config_user_id_key UNIQUE (user_id);

ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);

ALTER TABLE public.auth_accounts ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);

ALTER TABLE public.auth_audit_log ADD CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE public.auth_browsers ADD CONSTRAINT auth_browsers_pkey PRIMARY KEY (user_id, browser_hash);

ALTER TABLE public.auth_limits ADD CONSTRAINT auth_limits_key_key UNIQUE (key);

ALTER TABLE public.auth_limits ADD CONSTRAINT auth_limits_pkey PRIMARY KEY (id);

ALTER TABLE public.auth_rate_limits ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (key);

ALTER TABLE public.auth_recovery_codes ADD CONSTRAINT auth_recovery_codes_pkey PRIMARY KEY (user_id, code_hash);

ALTER TABLE public.auth_session_context ADD CONSTRAINT auth_session_context_pkey PRIMARY KEY (session_id);

ALTER TABLE public.auth_sessions ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE public.auth_sessions ADD CONSTRAINT auth_sessions_token_key UNIQUE (token);

ALTER TABLE public.auth_totp ADD CONSTRAINT auth_totp_pkey PRIMARY KEY (user_id);

ALTER TABLE public.auth_verifications ADD CONSTRAINT auth_verifications_pkey PRIMARY KEY (id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_local_id_key UNIQUE (local_id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.email_auth_challenges ADD CONSTRAINT email_auth_challenges_pkey PRIMARY KEY (token_hash);

ALTER TABLE public.follows ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);

ALTER TABLE public.identity_workspaces ADD CONSTRAINT identity_workspaces_pkey PRIMARY KEY (id);

ALTER TABLE public.identity_workspaces ADD CONSTRAINT identity_workspaces_role_check CHECK (role = ANY (ARRAY['client'::text, 'professional'::text, 'salon'::text, 'shop'::text, 'delivery'::text]));

ALTER TABLE public.identity_workspaces ADD CONSTRAINT identity_workspaces_status_check CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text]));

ALTER TABLE public.identity_workspaces ADD CONSTRAINT identity_workspaces_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE public.mfa_methods ADD CONSTRAINT mfa_methods_pkey PRIMARY KEY (id);

ALTER TABLE public.mfa_methods ADD CONSTRAINT uq_mfa_methods_user_type UNIQUE (user_id, type);

ALTER TABLE public.passkey_challenges ADD CONSTRAINT passkey_challenges_pkey PRIMARY KEY (challenge_hash);

ALTER TABLE public.passkey_credentials ADD CONSTRAINT passkey_credentials_credential_id_key UNIQUE (credential_id);

ALTER TABLE public.passkey_credentials ADD CONSTRAINT passkey_credentials_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_logs ADD CONSTRAINT payment_logs_checkout_request_id_key UNIQUE (checkout_request_id);

ALTER TABLE public.payment_logs ADD CONSTRAINT payment_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.posts ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE public.recovery_codes ADD CONSTRAINT recovery_codes_pkey PRIMARY KEY (id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE public.salon_memberships ADD CONSTRAINT salon_memberships_permission_check CHECK (permission = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text]));

ALTER TABLE public.salon_memberships ADD CONSTRAINT salon_memberships_pkey PRIMARY KEY (salon_id, user_id);

ALTER TABLE public.salon_workspaces ADD CONSTRAINT salon_workspaces_owner_id_key UNIQUE (owner_id);

ALTER TABLE public.salon_workspaces ADD CONSTRAINT salon_workspaces_pkey PRIMARY KEY (id);

ALTER TABLE public.security_events ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);

ALTER TABLE public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);

ALTER TABLE public.sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE public.sessions ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_author_name_check CHECK (char_length(author_name) >= 1 AND char_length(author_name) <= 120);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_author_role_check CHECK (author_role = ANY (ARRAY['client'::text, 'professional'::text, 'salon'::text]));

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_author_slug_check CHECK (author_slug IS NULL OR char_length(author_slug) <= 80);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_caption_check CHECK (char_length(caption) >= 1 AND char_length(caption) <= 2000);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_media_limit CHECK (cardinality(media_urls) <= 4);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_moderation_status_check CHECK (moderation_status = ANY (ARRAY['visible'::text, 'hidden'::text, 'removed'::text]));

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_post_type_check CHECK (post_type = ANY (ARRAY['before_after'::text, 'inspo'::text, 'tip'::text, 'portfolio'::text, 'promotion'::text]));

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_publication_status_check CHECK (publication_status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text]));

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_tags_limit CHECK (cardinality(tags) <= 10);

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_visibility_check CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text]));

ALTER TABLE public.stories ADD CONSTRAINT stories_pkey PRIMARY KEY (id);

ALTER TABLE public.user_blocks ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (blocker_id, blocked_id);

ALTER TABLE public.user_identities ADD CONSTRAINT uq_user_identity_provider_subject UNIQUE (provider, provider_subject);

ALTER TABLE public.user_identities ADD CONSTRAINT user_identities_pkey PRIMARY KEY (id);

ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_pkey PRIMARY KEY (id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (user_id);

ALTER TABLE public.users ADD CONSTRAINT uq_users_clerk_user_id UNIQUE (clerk_user_id);

ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);

ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);

ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.users ADD CONSTRAINT users_username_key UNIQUE (username);

ALTER TABLE public.whatsapp_auth_challenges ADD CONSTRAINT whatsapp_auth_challenges_pkey PRIMARY KEY (token_hash);

ALTER TABLE public.workspace_applications ADD CONSTRAINT workspace_applications_pkey PRIMARY KEY (user_id, role);

ALTER TABLE public.workspace_applications ADD CONSTRAINT workspace_applications_role_check CHECK (role = ANY (ARRAY['professional'::text, 'salon'::text]));

ALTER TABLE public.workspace_applications ADD CONSTRAINT workspace_applications_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

ALTER TABLE public.admin_account_config ADD CONSTRAINT admin_account_config_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.auth_accounts ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.auth_browsers ADD CONSTRAINT auth_browsers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.auth_recovery_codes ADD CONSTRAINT auth_recovery_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.auth_session_context ADD CONSTRAINT auth_session_context_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.auth_session_context ADD CONSTRAINT auth_session_context_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES identity_workspaces(id);

ALTER TABLE public.auth_sessions ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.auth_totp ADD CONSTRAINT auth_totp_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES users(id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES users(id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES users(id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_provider_workspace_id_fkey FOREIGN KEY (provider_workspace_id) REFERENCES identity_workspaces(id);

ALTER TABLE public.bookings ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id);

ALTER TABLE public.comments ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.comments ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.follows ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.identity_workspaces ADD CONSTRAINT identity_workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.mfa_methods ADD CONSTRAINT mfa_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.passkey_challenges ADD CONSTRAINT passkey_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.passkey_credentials ADD CONSTRAINT passkey_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_logs ADD CONSTRAINT payment_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE public.payment_logs ADD CONSTRAINT payment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.recovery_codes ADD CONSTRAINT recovery_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.reviews ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.salon_memberships ADD CONSTRAINT salon_memberships_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES salon_workspaces(id);

ALTER TABLE public.salon_memberships ADD CONSTRAINT salon_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.salon_workspaces ADD CONSTRAINT salon_workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id);

ALTER TABLE public.security_events ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.services ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.services ADD CONSTRAINT services_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES identity_workspaces(id);

ALTER TABLE public.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.social_posts ADD CONSTRAINT social_posts_author_workspace_id_fkey FOREIGN KEY (author_workspace_id) REFERENCES identity_workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.stories ADD CONSTRAINT stories_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_blocks ADD CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_blocks ADD CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_identities ADD CONSTRAINT user_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES users(id);

ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.users ADD CONSTRAINT users_last_workspace_id_fkey FOREIGN KEY (last_workspace_id) REFERENCES identity_workspaces(id);

ALTER TABLE public.workspace_applications ADD CONSTRAINT workspace_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id);

ALTER TABLE public.workspace_applications ADD CONSTRAINT workspace_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

CREATE INDEX "auth_accounts_userId_idx" ON public.auth_accounts USING btree ("userId");

CREATE INDEX "auth_sessions_userId_idx" ON public.auth_sessions USING btree ("userId");

CREATE INDEX auth_verifications_identifier_idx ON public.auth_verifications USING btree (identifier);

CREATE INDEX idx_analytics_created_at ON public.analytics_events USING btree (created_at);

CREATE INDEX idx_analytics_event_name ON public.analytics_events USING btree (event_name);

CREATE INDEX idx_analytics_user_id ON public.analytics_events USING btree (user_id);

CREATE INDEX idx_auth_audit_fingerprint ON public.auth_audit_log USING btree (device_fingerprint);

CREATE INDEX idx_auth_audit_method_created ON public.auth_audit_log USING btree (auth_method, created_at DESC);

CREATE INDEX idx_auth_audit_user_created ON public.auth_audit_log USING btree (user_id, created_at DESC);

CREATE INDEX idx_bookings_client_id ON public.bookings USING btree (client_id);

CREATE INDEX idx_bookings_idempotency ON public.bookings USING btree (idempotency_key);

CREATE INDEX idx_bookings_payment_status ON public.bookings USING btree (payment_status);

CREATE INDEX idx_bookings_provider_id ON public.bookings USING btree (provider_id);

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);

CREATE INDEX idx_email_challenges_email ON public.email_auth_challenges USING btree (email);

CREATE INDEX idx_email_challenges_expires ON public.email_auth_challenges USING btree (expires_at);

CREATE INDEX idx_mfa_methods_user_id ON public.mfa_methods USING btree (user_id);

CREATE INDEX idx_passkey_challenges_expires ON public.passkey_challenges USING btree (expires_at);

CREATE INDEX idx_passkey_credentials_user_id ON public.passkey_credentials USING btree (user_id);

CREATE INDEX idx_payment_logs_booking_id ON public.payment_logs USING btree (booking_id);

CREATE INDEX idx_payment_logs_checkout_request_id ON public.payment_logs USING btree (checkout_request_id);

CREATE INDEX idx_payment_logs_status ON public.payment_logs USING btree (status);

CREATE INDEX idx_payment_logs_user_id ON public.payment_logs USING btree (user_id);

CREATE INDEX idx_recovery_codes_user_id ON public.recovery_codes USING btree (user_id);

CREATE INDEX idx_reviews_client ON public.reviews USING btree (client_id);

CREATE INDEX idx_reviews_provider ON public.reviews USING btree (provider_id);

CREATE INDEX idx_reviews_provider_slug ON public.reviews USING btree (provider_slug);

CREATE INDEX idx_services_provider_id ON public.services USING btree (provider_id);

CREATE INDEX idx_sessions_token_hash ON public.sessions USING btree (token_hash);

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);

CREATE INDEX idx_user_blocks_blocker ON public.user_blocks USING btree (blocker_id);

CREATE INDEX idx_user_identities_clerk ON public.user_identities USING btree (provider, provider_subject) WHERE ((provider)::text = 'clerk'::text);

CREATE INDEX idx_user_identities_provider ON public.user_identities USING btree (provider);

CREATE INDEX idx_user_identities_user_id ON public.user_identities USING btree (user_id);

CREATE INDEX idx_user_reports_reporter ON public.user_reports USING btree (reporter_id);

CREATE INDEX idx_user_reports_status ON public.user_reports USING btree (status);

CREATE INDEX idx_users_clerk_user_id ON public.users USING btree (clerk_user_id);

CREATE INDEX security_events_user_time ON public.security_events USING btree (user_id, created_at DESC);

CREATE INDEX social_posts_author_user_idx ON public.social_posts USING btree (author_user_id, created_at DESC);

CREATE INDEX social_posts_author_workspace_idx ON public.social_posts USING btree (author_workspace_id, created_at DESC);

CREATE INDEX social_posts_public_created_idx ON public.social_posts USING btree (created_at DESC) WHERE ((deleted_at IS NULL) AND (visibility = 'public'::text) AND (publication_status = 'published'::text) AND (moderation_status = 'visible'::text));

CREATE INDEX whatsapp_challenge_expiry ON public.whatsapp_auth_challenges USING btree (expires_at);

ALTER SEQUENCE public.auth_audit_log_id_seq OWNED BY public.auth_audit_log.id;

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;
