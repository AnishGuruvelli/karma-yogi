ALTER TABLE sessions DROP COLUMN IF EXISTS kind;
ALTER TABLE sessions DROP COLUMN IF EXISTS linked_test_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS linked_test_type
