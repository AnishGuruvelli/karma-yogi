#!/usr/bin/env bash
# End-to-end API smoke test.
# Requires: docker, jq, python3 (stdlib only)
# Usage: ./scripts/e2e.sh
# Run from repo root or any subdirectory — the script resolves the root itself.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Prerequisites ──────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker is not installed."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required. Install with: brew install jq  (macOS) or apt-get install jq"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 is required for date calculations."
  exit 1
fi

# ── Environment ────────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[INFO] Created .env from .env.example"
fi

# ── Start services ─────────────────────────────────────────────────────────────
echo "[INFO] Starting docker services..."
docker compose up --build -d

echo "[INFO] Waiting for API health (up to 60 s)..."
for i in {1..30}; do
  if curl -fsS "http://localhost:8080/healthz" >/dev/null 2>&1; then
    echo "[INFO] API is up."
    break
  fi
  sleep 2
  if [[ "$i" == "30" ]]; then
    echo "[ERROR] API did not become healthy in time."
    docker compose logs api | tail -30
    exit 1
  fi
done

# ── Helpers ────────────────────────────────────────────────────────────────────
API="http://localhost:8080"

api_call() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "$API$path" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -fsS -X "$method" "$API$path" \
      -H "Authorization: Bearer $ACCESS_TOKEN"
  fi
}

friend_api_call() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "$API$path" \
      -H "Authorization: Bearer $FRIEND_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -fsS -X "$method" "$API$path" \
      -H "Authorization: Bearer $FRIEND_TOKEN"
  fi
}

# ── Register + Login ──────────────────────────────────────────────────────────
echo "[INFO] Register and authenticate primary E2E user..."
E2E_EMAIL="e2e.$(date +%s)@example.com"
E2E_PASSWORD="password123"

REGISTER_RESP="$(curl -fsS -X POST "$API/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"fullName\":\"E2E User\",\"password\":\"$E2E_PASSWORD\",\"secretAnswer\":\"hyderabad\"}")"
USER_ID="$(printf "%s" "$REGISTER_RESP" | jq -r '.user.id')"
ACCESS_TOKEN="$(printf "%s" "$REGISTER_RESP" | jq -r '.accessToken')"
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "[ERROR] Register did not return access token."
  exit 1
fi

LOGIN_RESP="$(curl -fsS -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$E2E_PASSWORD\"}")"
LOGIN_TOKEN="$(printf "%s" "$LOGIN_RESP" | jq -r '.accessToken')"
if [[ -z "$LOGIN_TOKEN" || "$LOGIN_TOKEN" == "null" ]]; then
  echo "[ERROR] Login did not return access token."
  exit 1
fi
REFRESH_ID_MAIN="$(printf "%s" "$LOGIN_RESP" | jq -r '.refreshId')"
REFRESH_TOKEN_MAIN="$(printf "%s" "$LOGIN_RESP" | jq -r '.refreshToken')"
ACCESS_TOKEN="$LOGIN_TOKEN"

# ── Password reset ─────────────────────────────────────────────────────────────
echo "[INFO] Verify password reset via secret answer..."
NEW_PASSWORD="password456"
curl -fsS -X POST "$API/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"secretAnswer\":\"hyderabad\",\"newPassword\":\"$NEW_PASSWORD\"}" >/dev/null

# Old password must now fail
BAD_LOGIN_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$E2E_PASSWORD\"}")"
if [[ "$BAD_LOGIN_CODE" != "401" ]]; then
  echo "[ERROR] Old password login should fail with 401 after reset, got $BAD_LOGIN_CODE"
  exit 1
fi

LOGIN_AFTER_RESET="$(curl -fsS -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")"
ACCESS_TOKEN="$(printf "%s" "$LOGIN_AFTER_RESET" | jq -r '.accessToken')"
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "[ERROR] Login after password reset did not return access token."
  exit 1
fi

# ── Dev login ──────────────────────────────────────────────────────────────────
echo "[INFO] Verify dev-login endpoint..."
DEV_RESP="$(curl -fsS -X POST "$API/api/v1/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d '{"email":"devtest@example.com"}')"
if [[ "$(printf "%s" "$DEV_RESP" | jq -r '.accessToken')" == "null" ]]; then
  echo "[ERROR] dev-login did not return an access token."
  exit 1
fi

# ── Second user for friends flow ──────────────────────────────────────────────
echo "[INFO] Register second user for friends flow..."
FRIEND_EMAIL="friend.$(date +%s)@example.com"
FRIEND_REGISTER_RESP="$(curl -fsS -X POST "$API/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$FRIEND_EMAIL\",\"fullName\":\"Friend User\",\"password\":\"password123\",\"secretAnswer\":\"hyderabad\"}")"
FRIEND_USER_ID="$(printf "%s" "$FRIEND_REGISTER_RESP" | jq -r '.user.id')"
FRIEND_TOKEN="$(printf "%s" "$FRIEND_REGISTER_RESP" | jq -r '.accessToken')"
if [[ -z "$FRIEND_TOKEN" || "$FRIEND_TOKEN" == "null" ]]; then
  echo "[ERROR] Friend register did not return access token."
  exit 1
fi

# ── Core profile endpoints ────────────────────────────────────────────────────
echo "[INFO] Testing /users/me ..."
ME="$(api_call GET "/api/v1/users/me")"
if [[ "$(printf "%s" "$ME" | jq -r '.id')" != "$USER_ID" ]]; then
  echo "[ERROR] /users/me returned wrong user id."
  exit 1
fi

echo "[INFO] Testing PATCH /users/me ..."
ME_UPDATE="$(api_call PATCH "/api/v1/users/me" '{"fullName":"E2E Updated","username":"e2eupdated","phone":""}')"
if [[ "$(printf "%s" "$ME_UPDATE" | jq -r '.fullName')" != "E2E Updated" ]]; then
  echo "[ERROR] PATCH /users/me did not update fullName."
  exit 1
fi
# Refresh ME after update
ME="$(api_call GET "/api/v1/users/me")"

# ── Subjects ──────────────────────────────────────────────────────────────────
echo "[INFO] Testing subjects..."
SUBJECT_NAME="E2E Subject $(date +%s)"
SUBJECT_CREATE="$(api_call POST "/api/v1/subjects" "{\"name\":\"$SUBJECT_NAME\",\"color\":\"cyan\"}")"
SUBJECT_ID="$(printf "%s" "$SUBJECT_CREATE" | jq -r '.id')"
if [[ -z "$SUBJECT_ID" || "$SUBJECT_ID" == "null" ]]; then
  echo "[ERROR] Subject create did not return id."
  exit 1
fi

# Patch subject color
SUBJECT_PATCH="$(api_call PATCH "/api/v1/subjects/$SUBJECT_ID" '{"color":"purple"}')"
if [[ "$(printf "%s" "$SUBJECT_PATCH" | jq -r '.color')" != "purple" ]]; then
  echo "[ERROR] PATCH /subjects/{id} did not update color."
  exit 1
fi

SUBJECT_LIST="$(api_call GET "/api/v1/subjects")"
if ! printf "%s" "$SUBJECT_LIST" | jq -e --arg sid "$SUBJECT_ID" '.[] | select(.id == $sid)' >/dev/null; then
  echo "[ERROR] Subject not found in list after create."
  exit 1
fi

# ── Sessions ──────────────────────────────────────────────────────────────────
echo "[INFO] Testing sessions..."
SESSION_CREATE="$(api_call POST "/api/v1/sessions" \
  "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"Algebra\",\"durationMin\":45,\"mood\":\"4\",\"startedAt\":\"2026-04-16T06:00:00Z\"}")"
SESSION_ID="$(printf "%s" "$SESSION_CREATE" | jq -r '.id')"
if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
  echo "[ERROR] Session create did not return id."
  exit 1
fi

SESSION_UPDATE="$(api_call PATCH "/api/v1/sessions/$SESSION_ID" \
  "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"Algebra Updated\",\"durationMin\":60,\"mood\":\"5\",\"startedAt\":\"2026-04-16T07:00:00Z\"}")"
if [[ "$(printf "%s" "$SESSION_UPDATE" | jq -r '.durationMin')" != "60" ]]; then
  echo "[ERROR] Session update did not persist durationMin."
  exit 1
fi

SESSION_LIST="$(api_call GET "/api/v1/sessions")"

# Create a second session to test individual delete
SESSION2="$(api_call POST "/api/v1/sessions" \
  "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"To Be Deleted\",\"durationMin\":10,\"mood\":\"3\",\"startedAt\":\"2026-04-17T06:00:00Z\"}")"
SESSION2_ID="$(printf "%s" "$SESSION2" | jq -r '.id')"
api_call DELETE "/api/v1/sessions/$SESSION2_ID" >/dev/null
SESSIONS_AFTER_DELETE="$(api_call GET "/api/v1/sessions")"
if printf "%s" "$SESSIONS_AFTER_DELETE" | jq -e --arg sid "$SESSION2_ID" '.[] | select(.id == $sid)' >/dev/null; then
  echo "[ERROR] Session still exists after DELETE /sessions/{id}."
  exit 1
fi

# ── Achievements ──────────────────────────────────────────────────────────────
echo "[INFO] Testing achievements..."
ACHIEVEMENTS="$(api_call GET "/api/v1/users/me/achievements")"
if ! printf "%s" "$ACHIEVEMENTS" | jq -e '.achievements | map(.key) | index("first_session")' >/dev/null; then
  echo "[ERROR] Achievements response missing first_session key."
  exit 1
fi
if [[ "$(printf "%s" "$ACHIEVEMENTS" | jq -r '.achievements[] | select(.key=="first_session") | .earned')" != "true" ]]; then
  echo "[ERROR] first_session achievement should be earned after creating a session."
  exit 1
fi

# ── Study stats ───────────────────────────────────────────────────────────────
echo "[INFO] Testing study stats..."
STUDY_STATS="$(api_call GET "/api/v1/users/me/study-stats?tz=UTC")"
if [[ "$(printf "%s" "$STUDY_STATS" | jq -r '.totalSessions')" -lt 1 ]]; then
  echo "[ERROR] study-stats totalSessions should be ≥ 1."
  exit 1
fi
if [[ "$(printf "%s" "$STUDY_STATS" | jq -r '.totalMinutes')" -lt 1 ]]; then
  echo "[ERROR] study-stats totalMinutes should be positive."
  exit 1
fi

# ── Goals ─────────────────────────────────────────────────────────────────────
echo "[INFO] Testing goals..."
GOAL_CREATE="$(api_call POST "/api/v1/goals" \
  '{"title":"Weekly Goal","targetMinutes":300,"deadline":"2026-05-16T00:00:00Z"}')"
GOAL_ID="$(printf "%s" "$GOAL_CREATE" | jq -r '.id')"
api_call PATCH "/api/v1/goals/$GOAL_ID" \
  '{"title":"Weekly Goal Updated","targetMinutes":360,"deadline":"2026-05-20T00:00:00Z"}' >/dev/null
GOAL_LIST="$(api_call GET "/api/v1/goals")"

# ── Exam goal ─────────────────────────────────────────────────────────────────
echo "[INFO] Testing exam goal..."
EXAM_GOAL_UPSERT="$(api_call PUT "/api/v1/exam-goal" '{"name":"CAT","examDate":"2026-11-29T00:00:00Z"}')"
if [[ "$(printf "%s" "$EXAM_GOAL_UPSERT" | jq -r '.examGoal.name')" != "CAT" ]]; then
  echo "[ERROR] Exam goal upsert did not return expected name."
  exit 1
fi
EXAM_GOAL_GET="$(api_call GET "/api/v1/exam-goal")"
if [[ "$(printf "%s" "$EXAM_GOAL_GET" | jq -r '.examGoal.name')" != "CAT" ]]; then
  echo "[ERROR] Exam goal GET did not return expected value."
  exit 1
fi

# ── Public profile / preferences / privacy ────────────────────────────────────
echo "[INFO] Testing profile / preferences / privacy..."
api_call PATCH "/api/v1/users/me/public-profile" \
  '{"bio":"E2E bio","location":"Bengaluru","education":"B.Tech","occupation":"Engineer","targetExam":"CAT 2026","targetCollege":"IIM A"}' >/dev/null
PROFILE_PUBLIC_GET="$(api_call GET "/api/v1/users/me/public-profile")"
if [[ "$(printf "%s" "$PROFILE_PUBLIC_GET" | jq -r '.bio')" != "E2E bio" ]]; then
  echo "[ERROR] Public profile patch/get mismatch."
  exit 1
fi

api_call PATCH "/api/v1/users/me/preferences" \
  '{"preferredStudyTime":"Evening","defaultSessionMinutes":55,"breakMinutes":12,"pomodoroCycles":5,"studyLevel":"Intermediate","weeklyGoalHours":24,"emailNotifications":true,"pushNotifications":true,"reminderNotifications":true,"marketingNotifications":false,"showStrategyPage":false}' >/dev/null
PREFERENCES_GET="$(api_call GET "/api/v1/users/me/preferences")"
if [[ "$(printf "%s" "$PREFERENCES_GET" | jq -r '.defaultSessionMinutes')" != "55" ]]; then
  echo "[ERROR] Preferences patch/get mismatch."
  exit 1
fi

api_call PATCH "/api/v1/users/me/privacy" '{"profilePublic":true,"showStats":true,"showLeaderboard":true}' >/dev/null
PRIVACY_GET="$(api_call GET "/api/v1/users/me/privacy")"
if [[ "$(printf "%s" "$PRIVACY_GET" | jq -r '.profilePublic')" != "true" ]]; then
  echo "[ERROR] Privacy patch/get mismatch."
  exit 1
fi

# ── Public profile by username (privacy-aware) ────────────────────────────────
echo "[INFO] Testing GET /users/{username}/public-profile..."
MY_USERNAME="$(printf "%s" "$ME" | jq -r '.username')"
PUBLIC_PROFILE_GET="$(friend_api_call GET "/api/v1/users/$MY_USERNAME/public-profile")"
if [[ "$(printf "%s" "$PUBLIC_PROFILE_GET" | jq -r '.profile.targetExam')" != "CAT 2026" ]]; then
  echo "[ERROR] GET /users/{username}/public-profile did not expose expected profile metadata."
  exit 1
fi

# ── Insights ──────────────────────────────────────────────────────────────────
echo "[INFO] Testing insights..."
INSIGHTS="$(api_call GET "/api/v1/insights")"

# ── Friends flow ──────────────────────────────────────────────────────────────
echo "[INFO] Testing friends flow..."

# Discover users
DISCOVER="$(api_call GET "/api/v1/friends/users")"
if ! printf "%s" "$DISCOVER" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.id == $fid)' >/dev/null; then
  echo "[ERROR] Friend user not visible in /friends/users discover list."
  exit 1
fi

# Send request
api_call POST "/api/v1/friends/requests" "{\"receiverId\":\"$FRIEND_USER_ID\"}" >/dev/null

# Outgoing requests
OUTGOING_REQS="$(api_call GET "/api/v1/friends/requests/outgoing")"
if ! printf "%s" "$OUTGOING_REQS" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.receiverId == $fid)' >/dev/null; then
  echo "[ERROR] Sent friend request not found in outgoing list."
  exit 1
fi

# Incoming requests (as friend)
INCOMING_REQS="$(friend_api_call GET "/api/v1/friends/requests/incoming")"
REQUEST_ID="$(printf "%s" "$INCOMING_REQS" | jq -r '.[0].id')"
if [[ -z "$REQUEST_ID" || "$REQUEST_ID" == "null" ]]; then
  echo "[ERROR] Incoming friend request not found."
  exit 1
fi

# Accept
friend_api_call POST "/api/v1/friends/requests/$REQUEST_ID/accept" >/dev/null
FRIENDS_LIST="$(api_call GET "/api/v1/friends")"
if ! printf "%s" "$FRIENDS_LIST" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.id == $fid)' >/dev/null; then
  echo "[ERROR] Friend not in list after accepting request."
  exit 1
fi

# Test reject: send a new request from friend → us, then reject it
THIRD_EMAIL="third.$(date +%s)@example.com"
THIRD_REGISTER="$(curl -fsS -X POST "$API/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$THIRD_EMAIL\",\"fullName\":\"Third User\",\"password\":\"password123\",\"secretAnswer\":\"hyderabad\"}")"
THIRD_TOKEN="$(printf "%s" "$THIRD_REGISTER" | jq -r '.accessToken')"
THIRD_USER_ID="$(printf "%s" "$THIRD_REGISTER" | jq -r '.user.id')"
# Friend sends request to main user
curl -fsS -X POST "$API/api/v1/friends/requests" \
  -H "Authorization: Bearer $THIRD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"receiverId\":\"$USER_ID\"}" >/dev/null
INCOMING_TO_REJECT="$(api_call GET "/api/v1/friends/requests/incoming")"
REJECT_REQUEST_ID="$(printf "%s" "$INCOMING_TO_REJECT" | jq -r --arg sid "$THIRD_USER_ID" '.[] | select(.senderId == $sid) | .id')"
if [[ -z "$REJECT_REQUEST_ID" || "$REJECT_REQUEST_ID" == "null" ]]; then
  echo "[ERROR] Could not find request to reject."
  exit 1
fi
api_call POST "/api/v1/friends/requests/$REJECT_REQUEST_ID/reject" >/dev/null
echo "[PASS] Reject friend request: OK"

# ── Shared friend sessions ────────────────────────────────────────────────────
echo "[INFO] Testing friend sessions with per-friend plan overrides..."
api_call POST "/api/v1/friends/sessions" \
  "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"self quant\",\"perFriendPlans\":[{\"friendId\":\"$FRIEND_USER_ID\",\"subjectName\":\"lrdi\",\"topic\":\"friend quant\"}],\"durationMin\":45,\"mood\":\"4\",\"startedAt\":\"2026-04-20T06:00:00Z\"}" >/dev/null

FRIEND_SESSIONS="$(friend_api_call GET "/api/v1/sessions")"
if ! printf "%s" "$FRIEND_SESSIONS" | jq -e '.[] | select(.topic == "friend quant")' >/dev/null; then
  echo "[ERROR] Per-friend plan session not created for friend user."
  exit 1
fi
SELF_SESSIONS="$(api_call GET "/api/v1/sessions")"
if ! printf "%s" "$SELF_SESSIONS" | jq -e '.[] | select(.topic == "self quant")' >/dev/null; then
  echo "[ERROR] Self session not created in friend sessions endpoint."
  exit 1
fi

# ── Friend profile details (POST /friends/friend-profile) ─────────────────────
echo "[INFO] Testing POST /friends/friend-profile..."
# Before friendship (use third user to check non-friend restriction)
PUBLIC_PROFILE_DETAILS_NON_FRIEND="$(curl -fsS -X POST "$API/api/v1/friends/friend-profile" \
  -H "Authorization: Bearer $THIRD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$MY_USERNAME\"}")"
if [[ "$(printf "%s" "$PUBLIC_PROFILE_DETAILS_NON_FRIEND" | jq -r '.canViewDetails')" != "false" ]]; then
  echo "[ERROR] Non-friend should see canViewDetails=false on friend-profile."
  exit 1
fi

# As confirmed friend
PUBLIC_PROFILE_DETAILS="$(friend_api_call POST "/api/v1/friends/friend-profile" \
  "{\"username\":\"$MY_USERNAME\"}")"
if [[ "$(printf "%s" "$PUBLIC_PROFILE_DETAILS" | jq -r '.canViewDetails')" != "true" ]]; then
  echo "[ERROR] Confirmed friend should see canViewDetails=true on friend-profile."
  exit 1
fi
if ! printf "%s" "$PUBLIC_PROFILE_DETAILS" | jq -e '.sessions | length > 0' >/dev/null; then
  echo "[ERROR] Friend profile details should include sessions for confirmed friends."
  exit 1
fi

# ── Leaderboard ───────────────────────────────────────────────────────────────
echo "[INFO] Testing friend leaderboard with week offsets..."
CURR_WEEK_STARTED_AT="$(python3 - <<'PY'
import datetime
now = datetime.datetime.now().astimezone()
monday = now - datetime.timedelta(days=now.weekday())
dt = monday.replace(hour=10, minute=0, second=0, microsecond=0)
print(dt.isoformat())
PY
)"
PREV_WEEK_STARTED_AT="$(python3 - <<'PY'
import datetime
now = datetime.datetime.now().astimezone()
monday = now - datetime.timedelta(days=now.weekday() + 7)
dt = monday.replace(hour=10, minute=0, second=0, microsecond=0)
print(dt.isoformat())
PY
)"
api_call POST "/api/v1/friends/sessions" \
  "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"current week session\",\"durationMin\":12,\"mood\":\"4\",\"startedAt\":\"$CURR_WEEK_STARTED_AT\"}" >/dev/null
api_call POST "/api/v1/friends/sessions" \
  "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"previous week session\",\"durationMin\":7,\"mood\":\"4\",\"startedAt\":\"$PREV_WEEK_STARTED_AT\"}" >/dev/null

LEADERBOARD="$(api_call GET "/api/v1/friends/leaderboard")"
if ! printf "%s" "$LEADERBOARD" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.userId == $fid)' >/dev/null; then
  echo "[ERROR] Friend not visible in leaderboard."
  exit 1
fi

LEADERBOARD_CURRENT="$(api_call GET "/api/v1/friends/leaderboard?weekOffset=0")"
LEADERBOARD_PREVIOUS="$(api_call GET "/api/v1/friends/leaderboard?weekOffset=-1")"
CURRENT_WEEK_MINUTES="$(printf "%s" "$LEADERBOARD_CURRENT" | jq -r --arg uid "$USER_ID" '[.[] | select(.userId == $uid)][0].weeklyMinutes // 0')"
PREV_WEEK_MINUTES="$(printf "%s" "$LEADERBOARD_PREVIOUS" | jq -r --arg uid "$USER_ID" '[.[] | select(.userId == $uid)][0].weeklyMinutes // 0')"
if [[ "$CURRENT_WEEK_MINUTES" -lt 12 ]]; then
  echo "[ERROR] Current week leaderboard missing expected minutes (got $CURRENT_WEEK_MINUTES)."
  exit 1
fi
if [[ "$PREV_WEEK_MINUTES" -lt 7 ]]; then
  echo "[ERROR] Previous week leaderboard missing expected minutes (got $PREV_WEEK_MINUTES)."
  exit 1
fi

# ── Timer state ───────────────────────────────────────────────────────────────
echo "[INFO] Testing timer state..."
api_call PUT "/api/v1/timer-state" \
  "{\"state\":{\"mode\":\"stopwatch\",\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"E2E Timer\",\"isRunning\":true}}" >/dev/null
TIMER_STATE="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$TIMER_STATE" | jq -r '.state.topic')" != "E2E Timer" ]]; then
  echo "[ERROR] Timer state round-trip failed."
  exit 1
fi

# Friend live timer payload
api_call PUT "/api/v1/timer-state" \
  "{\"state\":{\"timerType\":\"friend\",\"sessionMode\":\"live\",\"subjectName\":\"QUANT\",\"topic\":\"friend live\",\"friendIds\":[\"$FRIEND_USER_ID\"],\"hasStarted\":true,\"isRunning\":true}}" >/dev/null
FRIEND_TIMER_STATE="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$FRIEND_TIMER_STATE" | jq -r '.state.timerType')" != "friend" ]]; then
  echo "[ERROR] Friend timer state payload was not persisted."
  exit 1
fi

TIMER_START="$(api_call POST "/api/v1/timer-state/start")"
if [[ "$(printf "%s" "$TIMER_START" | jq -r '.startedAtMs | numbers')" == "" ]]; then
  echo "[ERROR] Timer start did not return startedAtMs."
  exit 1
fi

api_call DELETE "/api/v1/timer-state" >/dev/null
TIMER_EMPTY="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$TIMER_EMPTY" | jq -r '.state')" != "null" ]]; then
  echo "[ERROR] Timer state was not cleared."
  exit 1
fi

# ── Cleanup: cascade delete + goal + exam goal ────────────────────────────────
echo "[INFO] Cleanup and cascade assertions..."
api_call DELETE "/api/v1/subjects/$SUBJECT_ID" >/dev/null
CASCADED_LIST="$(api_call GET "/api/v1/sessions")"
if printf "%s" "$CASCADED_LIST" | jq -e --arg sid "$SESSION_ID" '.[] | select(.id == $sid)' >/dev/null; then
  echo "[ERROR] Session still exists after deleting its parent subject (cascade failed)."
  exit 1
fi
api_call DELETE "/api/v1/goals/$GOAL_ID" >/dev/null
api_call DELETE "/api/v1/exam-goal" >/dev/null
EXAM_GOAL_AFTER="$(api_call GET "/api/v1/exam-goal")"
if [[ "$(printf "%s" "$EXAM_GOAL_AFTER" | jq -r '.examGoal')" != "null" ]]; then
  echo "[ERROR] Exam goal not cleared after delete."
  exit 1
fi

# ── Refresh token rotation + logout ──────────────────────────────────────────
echo "[INFO] Testing refresh token rotation + logout..."
RAW_REFRESH="refresh-e2e-token"
REFRESH_HASH="$(printf "%s" "$RAW_REFRESH" | shasum -a 256 | awk '{print $1}')"
docker compose exec -T postgres psql -U karma -d karma_yogi -c \
  "INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at)
   VALUES ('22222222-2222-2222-2222-222222222222','$USER_ID','$REFRESH_HASH', now() + interval '1 day')
   ON CONFLICT (id) DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at, revoked_at=NULL;" >/dev/null

REFRESH_RESP="$(curl -fsS -X POST "$API/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshId":"22222222-2222-2222-2222-222222222222","refreshToken":"refresh-e2e-token"}')"
NEW_REFRESH_ID="$(printf "%s" "$REFRESH_RESP" | jq -r '.refreshId')"
if [[ -z "$NEW_REFRESH_ID" || "$NEW_REFRESH_ID" == "null" ]]; then
  echo "[ERROR] Refresh token rotation did not return new refreshId."
  exit 1
fi

# Old token must now be revoked
OLD_REFRESH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$API/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshId":"22222222-2222-2222-2222-222222222222","refreshToken":"refresh-e2e-token"}')"
if [[ "$OLD_REFRESH_CODE" != "401" ]]; then
  echo "[ERROR] Revoked refresh token should return 401, got $OLD_REFRESH_CODE"
  exit 1
fi

curl -fsS -X POST "$API/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refreshId\":\"$NEW_REFRESH_ID\"}" >/dev/null

# ── Nginx proxy + Google invalid token ───────────────────────────────────────
echo "[INFO] Testing Nginx proxy and Google invalid token..."
curl -fsS "http://localhost/api/v1/users/me" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null
INVALID_GOOGLE_CODE="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "$API/api/v1/auth/google" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token"}')"
if [[ "$INVALID_GOOGLE_CODE" != "401" ]]; then
  echo "[ERROR] /auth/google invalid token should return 401, got $INVALID_GOOGLE_CODE"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[PASS] All E2E checks completed successfully."
echo "[PASS] /users/me:           $(printf "%s" "$ME" | jq -r '.email')"
echo "[PASS] /sessions count:     $(printf "%s" "$SESSION_LIST" | jq 'length')"
echo "[PASS] /goals count:        $(printf "%s" "$GOAL_LIST" | jq 'length')"
echo "[PASS] /insights total min: $(printf "%s" "$INSIGHTS" | jq -r '.totalMinutes')"
echo "[PASS] study-stats total:   $(printf "%s" "$STUDY_STATS" | jq -r '.totalMinutes') min, $(printf "%s" "$STUDY_STATS" | jq -r '.totalSessions') sessions"
echo "[PASS] leaderboard (current week, self): ${CURRENT_WEEK_MINUTES} min"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
