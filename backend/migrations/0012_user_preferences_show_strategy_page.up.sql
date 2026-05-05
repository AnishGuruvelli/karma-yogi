ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS show_strategy_page BOOLEAN NOT NULL DEFAULT false;
