-- Index for public profile lookups by username (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (lower(username));

-- Index for sessions by subject_id (used in joins when computing subject stats)
CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON sessions (subject_id) WHERE subject_id IS NOT NULL;

-- Index for friend_requests by receiver (incoming request lookups)
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests (receiver_id);

-- Index for reverse friend lookup
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends (friend_id);

-- Index for refresh token cleanup and expiry checks
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
