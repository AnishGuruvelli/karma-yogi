ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_subject_id_fkey;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
