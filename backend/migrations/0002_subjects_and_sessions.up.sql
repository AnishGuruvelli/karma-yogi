CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_user_name_unique ON subjects (user_id, lower(name));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic TEXT;

UPDATE sessions SET topic = subject WHERE topic IS NULL OR topic = '';
