CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ NULL,
  CONSTRAINT chk_friend_request_status CHECK (status IN ('pending','accepted','rejected')),
  CONSTRAINT chk_friend_request_not_self CHECK (sender_id <> receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_unique_pair
  ON friend_requests (sender_id, receiver_id);

CREATE TABLE IF NOT EXISTS friends (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT chk_friends_not_self CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
