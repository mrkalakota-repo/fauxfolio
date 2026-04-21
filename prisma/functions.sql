-- update_previous_close()
-- Snapshots currentPrice → previousClose for all stocks at market close.
-- Called from the simulation tick route on the first tick after midnight ET each night.
-- Run once against the database to install (safe to re-run — uses CREATE OR REPLACE):
--   psql $DATABASE_URL -f prisma/functions.sql

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
