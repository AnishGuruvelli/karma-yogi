# Karma Yogi Backend API Contract

**File:** `/Users/admin/Code/karma-yogi/docs/openapi.yaml`

## API Info
- **Title:** Karma Yogi API
- **Version:** 2.0.0
- **Base Path:** `/api/v1` (all routes except GET /healthz which is at server root)

---

## Authentication Model

### Short-lived Access Tokens
- Default TTL: 15 minutes (env: `JWT_ACCESS_TTL_MINUTES`)
- Format: JWT signed, sent in `Authorization: Bearer <token>` header
- All authenticated routes require this header

### Long-lived Rotating Refresh Tokens
- Default TTL: 720 hours = 30 days (env: `JWT_REFRESH_TTL_HOURS`)
- Format: { refreshId (UUID), refreshToken (string) }
- Server rotates on every `/auth/refresh` call (revokes old, issues new)
- Client stores both in localStorage

### Concurrent 401 Handling
On 401:
1. Client calls `POST /auth/refresh` with { refreshId, refreshToken }
2. Server issues new { accessToken, refreshId, refreshToken } and revokes old refreshId
3. **Concurrent requests:** Shared in-flight promise prevents rotation races
4. Parallel 401s all wait on single refresh, preventing token rotation conflicts

### Client Headers
| Header | Values | Description |
|--------|--------|-------------|
| `X-Client-Platform` | `web` / `android` / `ios` | Required |
| `X-App-Version` | semver string | Optional |

---

## Rate Limiting
- **Limit:** 180 requests per minute per IP
- **Algorithm:** Sliding window
- **Scope:** Global (all IPs combined)

---

## Auth Endpoints

### POST /auth/google
Google OAuth login
```
Request: { token: string }
Response: AuthResult (user + tokens)
Status: 200 OK | 401 Unauthorized
```

### POST /auth/register
Email/password registration
```
Request: { email, fullName, password, secretAnswer }
Response: AuthResult
Status: 200 OK | 400 Bad Request
```

### POST /auth/login
Email/password login
```
Request: { email, password }
Response: AuthResult
Status: 200 OK | 400 Bad Request
```

### POST /auth/password-reset
Reset password with security question
```
Request: { email, secretAnswer, newPassword }
Response: (empty on success)
Status: 200 OK | 400 Bad Request
```

### POST /auth/dev-login
Development login (dev mode only)
```
Request: { email? }
Response: AuthResult
Status: 200 OK | 400 Bad Request
```

### POST /auth/refresh
Refresh access token
```
Request: { refreshId, refreshToken }
Response: AuthResult (with new refreshId + refreshToken)
Status: 200 OK | 401 Unauthorized
Note: Server rotates refresh token on success
```

### POST /auth/logout
Logout (optional client call; success either way)
```
Request: { refreshId }
Response: (empty)
Status: 200 OK
Action: Revokes refreshId on server
```

---

## User Endpoints (Authenticated)

### GET /users/me
Current user profile
```
Response: User { id, email, fullName, username, phone, avatarUrl?, createdAt, updatedAt }
Status: 200 OK | 401 Unauthorized
```

### PATCH /users/me
Update user profile
```
Request: { fullName, username, phone, avatarUrl? }
Response: User
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

---

## Public Profile Endpoints

### GET /users/me/public-profile
Get current user's public profile settings
```
Response: UserPublicProfile { userId, bio, location, education, occupation, targetExam, targetCollege, createdAt, updatedAt }
Status: 200 OK | 401 Unauthorized
```

### PATCH /users/me/public-profile
Update public profile
```
Request: { bio, location, education, occupation, targetExam, targetCollege }
Response: UserPublicProfile
Status: 200 OK | 401 Unauthorized
```

### GET /users/{username}/public-profile
Get another user's public profile
```
Response: PublicProfileView {
  user: { id, email, fullName, username, avatarUrl? },
  profile: UserPublicProfile,
  privacy: UserPrivacySettings,
  stats?: PublicProfileStats (conditionally included)
}
Status: 200 OK | 404 Not Found | 401 Unauthorized
```

### POST /friends/friend-profile
Get detailed public profile with sessions, insights, heatmap
```
Request: { username: string, page: number, limit: number }
Response: PublicProfileDetails {
  user, profile, privacy, canViewDetails,
  overview?: PublicProfileOverview,
  sessions?: PublicProfileSessionEntry[],
  sessionsTotal, sessionsHasMore,
  insights?: PublicProfileInsightsPayload,
  heatmap?: Record<string, number>
}
Status: 200 OK | 404 Not Found | 401 Unauthorized
```

---

## Preferences & Privacy Endpoints

### GET /users/me/preferences
```
Response: UserPreferences
Status: 200 OK | 401 Unauthorized
```

### PATCH /users/me/preferences
```
Request: Partial UserPreferences (all fields optional)
Response: UserPreferences (normalized)
Status: 200 OK | 401 Unauthorized
```

### GET /users/me/privacy
```
Response: UserPrivacySettings
Status: 200 OK | 401 Unauthorized
```

### PATCH /users/me/privacy
```
Request: Partial UserPrivacySettings
Response: UserPrivacySettings
Status: 200 OK | 401 Unauthorized
```

---

## Subject Endpoints

### POST /subjects
Create subject
```
Request: { name, color }
Response: Subject { id, name, color, icon, createdAt }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
```

### GET /subjects
List subjects for current user
```
Response: Subject[]
Status: 200 OK | 401 Unauthorized
```

### PATCH /subjects/{id}
Update subject color
```
Request: { color }
Response: Subject
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### DELETE /subjects/{id}
Delete subject (cascades to sessions)
```
Status: 204 No Content | 400 Bad Request | 401 Unauthorized
```

---

## Session Endpoints

### POST /sessions
Create session
```
Request: { subjectId, topic, durationMin, mood: "1"-"5", startedAt: ISO8601 }
Response: Session { id, userId, subjectId, topic, durationMin, mood, startedAt, createdAt }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
```

### GET /sessions
List all sessions for current user
```
Query: (optional filters not documented in OpenAPI)
Response: Session[]
Status: 200 OK | 401 Unauthorized
```

### PATCH /sessions/{id}
Update session
```
Request: { subjectId, topic, durationMin, mood, startedAt }
Response: Session
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### DELETE /sessions/{id}
Delete session
```
Status: 204 No Content | 400 Bad Request | 401 Unauthorized
```

---

## Goal Endpoints

### POST /goals
Create goal
```
Request: { title, targetMinutes, deadline: ISO8601 }
Response: Goal { id, userId, title, targetMinutes, deadline, createdAt, updatedAt }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
```

### GET /goals
List goals
```
Response: Goal[]
Status: 200 OK | 401 Unauthorized
```

### PATCH /goals/{id}
Update goal
```
Request: { title?, targetMinutes?, deadline? }
Response: Goal
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### DELETE /goals/{id}
Delete goal
```
Status: 204 No Content | 401 Unauthorized
```

---

## Exam Goal Endpoints

### GET /exam-goal
Get exam goal (wrapped response)
```
Response: { examGoal: ExamGoal | null }
Status: 200 OK | 401 Unauthorized
```

### PUT /exam-goal
Upsert exam goal
```
Request: { name, examDate: ISO8601 }
Response: { examGoal: ExamGoal }
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### DELETE /exam-goal
Delete exam goal
```
Status: 204 No Content | 401 Unauthorized
```

---

## Achievement & Stats Endpoints

### GET /users/me/achievements
List achievements
```
Response: { achievements: UserAchievement[] }
Keys: seven_day_streak, fourteen_day_warrior, century_club, first_session,
      deep_work, social_studier, subject_master, goal_crusher, early_bird, mock_master
Status: 200 OK | 401 Unauthorized
```

### GET /users/me/study-stats
Server-aggregated stats
```
Query: tz?: string (timezone for week calculation)
Response: StudyStatsSummary {
  totalMinutes, totalSessions, avgSessionMinutes, longestSessionMinutes,
  avgMood, activeDistinctDays, weekMinutesCurrent, timezoneUsed
}
Status: 200 OK | 401 Unauthorized
```

---

## Timer State Endpoints

### GET /timer-state
Fetch timer state (opaque object)
```
Response: { state?: Record<string, unknown> | null }
Status: 200 OK | 401 Unauthorized
```

### POST /timer-state/start
Start timer on server
```
Response: { startedAtMs: number }
Status: 200 OK | 401 Unauthorized
```

### PUT /timer-state
Save timer state
```
Request: { state: Record<string, unknown> }
Status: 204 No Content | 401 Unauthorized
```

### DELETE /timer-state
Clear timer state
```
Status: 204 No Content | 401 Unauthorized
```

---

## Friends Endpoints

### GET /friends/users
Discover users
```
Response: FriendUser[] { id, email, fullName, username, friendshipStatus: "none"|"incoming"|"outgoing"|"friends" }
Status: 200 OK | 401 Unauthorized
```

### GET /friends
List friends
```
Response: UserProfile[] (mapped from User domain)
Status: 200 OK | 401 Unauthorized
```

### GET /friends/requests/incoming
List incoming friend requests
```
Response: FriendRequest[]
Status: 200 OK | 401 Unauthorized
```

### GET /friends/requests/outgoing
List outgoing friend requests
```
Response: FriendRequest[]
Status: 200 OK | 401 Unauthorized
```

### POST /friends/requests
Send friend request
```
Request: { receiverId }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
```

### POST /friends/requests/{id}/accept
Accept friend request
```
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### POST /friends/requests/{id}/reject
Reject friend request
```
Status: 200 OK | 400 Bad Request | 401 Unauthorized
```

### GET /friends/leaderboard
Weekly leaderboard
```
Query: weekOffset?: number, from?: ISO8601, to?: ISO8601
Response: LeaderboardEntry[] { userId, fullName, username, weeklyMinutes }
Status: 200 OK | 401 Unauthorized
```

### POST /friends/sessions
Create friend session (group study)
```
Request: {
  friendIds: string[],
  subjectName: string,
  topic: string,
  perFriendPlans?: Array<{ friendId, subjectName, topic }>,
  durationMin: number,
  mood: string,
  startedAt: ISO8601
}
Status: 201 Created | 400 Bad Request | 401 Unauthorized
```

---

## Response Types

### AuthResult
```
{
  user: User,
  accessToken: string,
  refreshId: string (UUID),
  refreshToken: string
}
```

### Error
```
{
  error: string
}
or
{
  message: string
}
```
