CREATE TABLE IF NOT EXISTS user_public_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '',
  target_exam TEXT NOT NULL DEFAULT '',
  target_college TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_study_time TEXT NOT NULL DEFAULT '',
  default_session_minutes INT NOT NULL DEFAULT 50,
  break_minutes INT NOT NULL DEFAULT 10,
  pomodoro_cycles INT NOT NULL DEFAULT 4,
  study_level TEXT NOT NULL DEFAULT '',
  weekly_goal_hours INT NOT NULL DEFAULT 20,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  reminder_notifications BOOLEAN NOT NULL DEFAULT true,
  marketing_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_public BOOLEAN NOT NULL DEFAULT true,
  show_stats BOOLEAN NOT NULL DEFAULT true,
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
