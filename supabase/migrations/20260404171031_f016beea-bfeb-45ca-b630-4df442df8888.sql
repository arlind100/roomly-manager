
-- Add sync health tracking columns to ical_feeds
ALTER TABLE public.ical_feeds
  ADD COLUMN IF NOT EXISTS last_sync_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_sync_errors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_sync_imported integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_updated integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_cancelled integer DEFAULT 0;

-- Enable pg_cron and pg_net for auto-scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
