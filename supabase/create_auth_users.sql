-- Fine Glaze COS — Seed real auth users + matching profiles
-- Creates 5 confirmed auth users directly (bypasses email send / TLD validation issues)
-- Set your own test password below before running (replace CHANGE_ME_PASSWORD).

DO $$
DECLARE
  v_owner_id UUID := gen_random_uuid();
  v_supervisor_id UUID := gen_random_uuid();
  v_worker1_id UUID := gen_random_uuid();
  v_worker2_id UUID := gen_random_uuid();
  v_client_id UUID := gen_random_uuid();
  v_password TEXT := crypt('CHANGE_ME_PASSWORD', gen_salt('bf'));
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Insert auth.users (confirmed, no email actually sent)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    (v_instance_id, v_owner_id, 'authenticated', 'authenticated', '9876543210@fineglazeapp.com', v_password, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (v_instance_id, v_supervisor_id, 'authenticated', 'authenticated', '9876543211@fineglazeapp.com', v_password, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (v_instance_id, v_worker1_id, 'authenticated', 'authenticated', '9876543212@fineglazeapp.com', v_password, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (v_instance_id, v_worker2_id, 'authenticated', 'authenticated', '9876543213@fineglazeapp.com', v_password, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    (v_instance_id, v_client_id, 'authenticated', 'authenticated', '9876500000@fineglazeapp.com', v_password, now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  -- Insert auth.identities (required for password sign-in to resolve)
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_owner_id, v_owner_id::text, jsonb_build_object('sub', v_owner_id::text, 'email', '9876543210@fineglazeapp.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_supervisor_id, v_supervisor_id::text, jsonb_build_object('sub', v_supervisor_id::text, 'email', '9876543211@fineglazeapp.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_worker1_id, v_worker1_id::text, jsonb_build_object('sub', v_worker1_id::text, 'email', '9876543212@fineglazeapp.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_worker2_id, v_worker2_id::text, jsonb_build_object('sub', v_worker2_id::text, 'email', '9876543213@fineglazeapp.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_client_id, v_client_id::text, jsonb_build_object('sub', v_client_id::text, 'email', '9876500000@fineglazeapp.com'), 'email', now(), now(), now());

  -- Insert matching profiles
  INSERT INTO profiles (id, company_id, full_name, phone, role, worker_id, daily_rate) VALUES
    (v_owner_id, '00000000-0000-0000-0000-000000000001', 'Rohan Gupta', '9876543210', 'owner', NULL, NULL),
    (v_supervisor_id, '00000000-0000-0000-0000-000000000001', 'Amit Singh', '9876543211', 'supervisor', 'W-1001', 800),
    (v_worker1_id, '00000000-0000-0000-0000-000000000001', 'Rahul Kumar', '9876543212', 'worker', 'W-1002', 600),
    (v_worker2_id, '00000000-0000-0000-0000-000000000001', 'Suresh Patil', '9876543213', 'worker', 'W-1003', 600),
    (v_client_id, '00000000-0000-0000-0000-000000000001', 'Vikram Mehta', '9876500000', 'client', NULL, NULL);

  RAISE NOTICE 'Created users: owner=%, supervisor=%, worker1=%, worker2=%, client=%', v_owner_id, v_supervisor_id, v_worker1_id, v_worker2_id, v_client_id;
END $$;
