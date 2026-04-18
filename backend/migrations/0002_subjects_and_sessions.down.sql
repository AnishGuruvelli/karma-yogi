ALTER TABLE sessions DROP COLUMN IF EXISTS topic;
ALTER TABLE sessions DROP COLUMN IF EXISTS subject_id;
DROP INDEX IF EXISTS idx_subjects_user_name_unique;
DROP TABLE IF EXISTS subjects;
