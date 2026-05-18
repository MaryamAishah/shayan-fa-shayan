ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS scheduled_time time,
  ADD COLUMN IF NOT EXISTS stack_on text;