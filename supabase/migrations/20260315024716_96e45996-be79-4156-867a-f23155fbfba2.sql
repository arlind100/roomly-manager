
ALTER TABLE public.hotels ADD COLUMN ical_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill existing rows
UPDATE public.hotels SET ical_token = encode(gen_random_bytes(16), 'hex') WHERE ical_token IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.hotels ALTER COLUMN ical_token SET NOT NULL;
