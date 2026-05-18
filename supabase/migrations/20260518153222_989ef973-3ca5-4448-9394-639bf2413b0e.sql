ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS reminder text,
  ADD COLUMN IF NOT EXISTS dua text,
  ADD COLUMN IF NOT EXISTS location text;