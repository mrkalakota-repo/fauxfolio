-- =============================================================================
-- FauxFolio database functions
-- Apply once (safe to re-run — all statements use CREATE OR REPLACE):
--   psql $DATABASE_URL -f prisma/functions.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- update_previous_close()
-- Low-level: snapshots currentPrice → previousClose for every stock whose
-- price has changed. Called by nightly_close_snapshot(). Safe to call manually.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_previous_close()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE stocks
  SET "previousClose" = "currentPrice"
  WHERE "currentPrice" <> "previousClose";

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- nightly_close_snapshot()
-- Idempotent wrapper: checks market_state.lastCloseDate before running so it
-- is safe to call multiple times in a day (second call is a no-op).
-- Scheduled via pg_cron (production) or launchd (local dev).
-- Returns the number of stocks updated, or 0 if already ran today.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION nightly_close_snapshot()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  today_et    TEXT;
  last_date   TEXT;
  n           INTEGER;
BEGIN
  today_et := TO_CHAR(NOW() AT TIME ZONE 'America/New_York', 'YYYY-MM-DD');

  SELECT "lastCloseDate" INTO last_date FROM market_state WHERE id = 1;

  -- Already ran today — skip
  IF last_date = today_et THEN
    RETURN 0;
  END IF;

  -- Snapshot all changed prices
  UPDATE stocks
  SET "previousClose" = "currentPrice"
  WHERE "currentPrice" <> "previousClose";

  GET DIAGNOSTICS n = ROW_COUNT;

  -- Record that we ran today so subsequent calls are no-ops
  INSERT INTO market_state (id, vix, "lastCloseDate", "updatedAt")
  VALUES (1, 20, today_et, NOW())
  ON CONFLICT (id) DO UPDATE
    SET "lastCloseDate" = today_et,
        "updatedAt"     = NOW();

  RETURN n;
END;
$$;

-- =============================================================================
-- pg_cron schedule (Neon production)
-- =============================================================================
-- Prerequisites:
--   1. Enable the pg_cron extension in Neon Console → Extensions
--   2. Run the two SELECT statements below once
--
-- Scheduling strategy — pg_cron uses UTC; ET observes DST:
--   • EST (Nov–Mar): UTC-5  →  midnight ET = 05:00 UTC
--   • EDT (Mar–Nov): UTC-4  →  midnight ET = 04:00 UTC
-- Both jobs are scheduled; nightly_close_snapshot() is idempotent so the
-- second one that fires is always a no-op.
--
-- Run once to install:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'nightly-close-est',
--   '0 5 * * *',
--   'SELECT nightly_close_snapshot()'
-- );
--
-- SELECT cron.schedule(
--   'nightly-close-edt',
--   '0 4 * * *',
--   'SELECT nightly_close_snapshot()'
-- );
--
-- To verify jobs are registered:
--   SELECT jobid, jobname, schedule, command FROM cron.job;
--
-- To remove a job:
--   SELECT cron.unschedule('nightly-close-est');
--   SELECT cron.unschedule('nightly-close-edt');
-- =============================================================================
