ALTER TABLE qotd_entries RENAME COLUMN time_taken_sec TO time_taken_min;
ALTER TABLE qotd_entries ADD COLUMN IF NOT EXISTS questions_correct INT;
ALTER TABLE qotd_entries ADD COLUMN IF NOT EXISTS questions_total INT;
