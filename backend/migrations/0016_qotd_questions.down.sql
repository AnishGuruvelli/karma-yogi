ALTER TABLE qotd_entries DROP COLUMN IF EXISTS questions_correct;
ALTER TABLE qotd_entries DROP COLUMN IF EXISTS questions_total;
ALTER TABLE qotd_entries RENAME COLUMN time_taken_min TO time_taken_sec;
