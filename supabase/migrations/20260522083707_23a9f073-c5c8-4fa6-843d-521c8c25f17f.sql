ALTER TABLE public.habits
  ADD COLUMN IF NOT EXISTS habit_type text NOT NULL DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS replacement text,
  ADD COLUMN IF NOT EXISTS minimum_target text;