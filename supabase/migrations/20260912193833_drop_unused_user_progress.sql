-- The optional account/cloud-sync feature this backed was removed; this app is
-- single-user and keeps progress in on-device SQLite only.
drop table if exists public.user_progress;
