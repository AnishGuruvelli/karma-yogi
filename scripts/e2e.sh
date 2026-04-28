#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker is not installed."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[ERROR] jq is required for E2E tests."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[INFO] Created .env from .env.example"
fi

echo "[INFO] Starting docker services..."
docker compose up --build -d

echo "[INFO] Waiting for API health..."
for i in {1..30}; do
  if curl -fsS "http://localhost:8080/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [[ "$i" == "30" ]]; then
    echo "[ERROR] API did not become healthy in time."
    exit 1
  fi
done

echo "[INFO] Creating and authenticating E2E user via public auth APIs..."
E2E_EMAIL="e2e.$(date +%s)@example.com"
E2E_PASSWORD="password123"
REGISTER_RESP="$(curl -fsS -X POST "http://localhost:8080/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"fullName\":\"E2E User\",\"password\":\"$E2E_PASSWORD\",\"secretAnswer\":\"hyderabad\"}")"
USER_ID="$(printf "%s" "$REGISTER_RESP" | jq -r '.user.id')"
ACCESS_TOKEN="$(printf "%s" "$REGISTER_RESP" | jq -r '.accessToken')"
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "[ERROR] Register did not return access token."
  exit 1
fi
LOGIN_RESP="$(curl -fsS -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$E2E_PASSWORD\"}")"
LOGIN_TOKEN="$(printf "%s" "$LOGIN_RESP" | jq -r '.accessToken')"
if [[ -z "$LOGIN_TOKEN" || "$LOGIN_TOKEN" == "null" ]]; then
  echo "[ERROR] Login did not return access token."
  exit 1
fi

echo "[INFO] Verifying password reset via secret answer..."
NEW_PASSWORD="password456"
curl -fsS -X POST "http://localhost:8080/api/v1/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"secretAnswer\":\"hyderabad\",\"newPassword\":\"$NEW_PASSWORD\"}" >/dev/null

BAD_LOGIN_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$E2E_PASSWORD\"}")"
if [[ "$BAD_LOGIN_CODE" != "401" ]]; then
  echo "[ERROR] Expected old password login to fail with 401 after reset, got $BAD_LOGIN_CODE"
  exit 1
fi

LOGIN_AFTER_RESET="$(curl -fsS -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$E2E_EMAIL\",\"password\":\"$NEW_PASSWORD\"}")"
ACCESS_TOKEN="$(printf "%s" "$LOGIN_AFTER_RESET" | jq -r '.accessToken')"
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "[ERROR] Login after password reset did not return access token."
  exit 1
fi

echo "[INFO] Creating second user for friends flow..."
FRIEND_EMAIL="friend.$(date +%s)@example.com"
FRIEND_PASSWORD="password123"
FRIEND_REGISTER_RESP="$(curl -fsS -X POST "http://localhost:8080/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$FRIEND_EMAIL\",\"fullName\":\"Friend User\",\"password\":\"$FRIEND_PASSWORD\",\"secretAnswer\":\"hyderabad\"}")"
FRIEND_USER_ID="$(printf "%s" "$FRIEND_REGISTER_RESP" | jq -r '.user.id')"
FRIEND_TOKEN="$(printf "%s" "$FRIEND_REGISTER_RESP" | jq -r '.accessToken')"
if [[ -z "$FRIEND_TOKEN" || "$FRIEND_TOKEN" == "null" ]]; then
  echo "[ERROR] Friend register did not return access token."
  exit 1
fi

api_call() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "http://localhost:8080$path" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -fsS -X "$method" "http://localhost:8080$path" \
      -H "Authorization: Bearer $ACCESS_TOKEN"
  fi
}

friend_api_call() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [[ -n "$data" ]]; then
    curl -fsS -X "$method" "http://localhost:8080$path" \
      -H "Authorization: Bearer $FRIEND_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -fsS -X "$method" "http://localhost:8080$path" \
      -H "Authorization: Bearer $FRIEND_TOKEN"
  fi
}

echo "[INFO] Running authenticated API flow..."
ME="$(api_call GET "/api/v1/users/me")"
SUBJECT_NAME="E2E Subject $(date +%s)"
SUBJECT_CREATE="$(api_call POST "/api/v1/subjects" "{\"name\":\"$SUBJECT_NAME\",\"color\":\"cyan\"}")"
SUBJECT_ID="$(printf "%s" "$SUBJECT_CREATE" | jq -r '.id')"
SESSION_CREATE="$(api_call POST "/api/v1/sessions" "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"Algebra\",\"durationMin\":45,\"mood\":\"4\",\"startedAt\":\"2026-04-16T06:00:00Z\"}")"
SESSION_ID="$(printf "%s" "$SESSION_CREATE" | jq -r '.id')"
SESSION_UPDATE="$(api_call PATCH "/api/v1/sessions/$SESSION_ID" "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"Algebra Updated\",\"durationMin\":60,\"mood\":\"5\",\"startedAt\":\"2026-04-16T07:00:00Z\"}")"
UPDATED_DURATION="$(printf "%s" "$SESSION_UPDATE" | jq -r '.durationMin')"
SESSION_LIST="$(api_call GET "/api/v1/sessions")"
GOAL_CREATE="$(api_call POST "/api/v1/goals" '{"title":"Weekly Goal","targetMinutes":300,"deadline":"2026-05-16T00:00:00Z"}')"
GOAL_ID="$(printf "%s" "$GOAL_CREATE" | jq -r '.id')"
GOAL_UPDATE="$(api_call PATCH "/api/v1/goals/$GOAL_ID" '{"title":"Weekly Goal Updated","targetMinutes":360,"deadline":"2026-05-20T00:00:00Z"}')"
GOAL_LIST="$(api_call GET "/api/v1/goals")"
EXAM_GOAL_UPSERT="$(api_call PUT "/api/v1/exam-goal" '{"name":"CAT","examDate":"2026-11-29T00:00:00Z"}')"
EXAM_GOAL_GET="$(api_call GET "/api/v1/exam-goal")"
if [[ "$(printf "%s" "$EXAM_GOAL_UPSERT" | jq -r '.examGoal.name')" != "CAT" ]]; then
  echo "[ERROR] Exam goal upsert did not return expected name."
  exit 1
fi
if [[ "$(printf "%s" "$EXAM_GOAL_GET" | jq -r '.examGoal.name')" != "CAT" ]]; then
  echo "[ERROR] Exam goal get did not return expected value."
  exit 1
fi
PROFILE_PUBLIC_PATCH="$(api_call PATCH "/api/v1/users/me/public-profile" '{"bio":"E2E bio","location":"Bengaluru","education":"B.Tech","occupation":"Engineer","targetExam":"CAT 2026","targetCollege":"IIM A"}')"
PROFILE_PUBLIC_GET="$(api_call GET "/api/v1/users/me/public-profile")"
if [[ "$(printf "%s" "$PROFILE_PUBLIC_GET" | jq -r '.bio')" != "E2E bio" ]]; then
  echo "[ERROR] Public profile patch/get mismatch."
  exit 1
fi
PREFERENCES_PATCH="$(api_call PATCH "/api/v1/users/me/preferences" '{"preferredStudyTime":"Evening","defaultSessionMinutes":55,"breakMinutes":12,"pomodoroCycles":5,"studyLevel":"Intermediate","weeklyGoalHours":24,"emailNotifications":true,"pushNotifications":true,"reminderNotifications":true,"marketingNotifications":false}')"
PREFERENCES_GET="$(api_call GET "/api/v1/users/me/preferences")"
if [[ "$(printf "%s" "$PREFERENCES_GET" | jq -r '.defaultSessionMinutes')" != "55" ]]; then
  echo "[ERROR] Preferences patch/get mismatch."
  exit 1
fi
PRIVACY_PATCH="$(api_call PATCH "/api/v1/users/me/privacy" '{"profilePublic":true,"showStats":true,"showLeaderboard":true}')"
PRIVACY_GET="$(api_call GET "/api/v1/users/me/privacy")"
if [[ "$(printf "%s" "$PRIVACY_GET" | jq -r '.profilePublic')" != "true" ]]; then
  echo "[ERROR] Privacy patch/get mismatch."
  exit 1
fi
PUBLIC_PROFILE_GET="$(friend_api_call GET "/api/v1/users/$(printf "%s" "$ME" | jq -r '.username')/public-profile")"
if [[ "$(printf "%s" "$PUBLIC_PROFILE_GET" | jq -r '.profile.targetExam')" != "CAT 2026" ]]; then
  echo "[ERROR] Public profile endpoint did not expose expected profile metadata."
  exit 1
fi
INSIGHTS="$(api_call GET "/api/v1/insights")"
echo "[INFO] Running friends flow..."
api_call POST "/api/v1/friends/requests" "{\"receiverId\":\"$FRIEND_USER_ID\"}" >/dev/null
INCOMING_REQS="$(friend_api_call GET "/api/v1/friends/requests/incoming")"
REQUEST_ID="$(printf "%s" "$INCOMING_REQS" | jq -r '.[0].id')"
if [[ -z "$REQUEST_ID" || "$REQUEST_ID" == "null" ]]; then
  echo "[ERROR] Incoming friend request not found."
  exit 1
fi
friend_api_call POST "/api/v1/friends/requests/$REQUEST_ID/accept" >/dev/null
FRIENDS_LIST="$(api_call GET "/api/v1/friends")"
if ! printf "%s" "$FRIENDS_LIST" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.id == $fid)' >/dev/null; then
  echo "[ERROR] Friend was not added after accepting request."
  exit 1
fi
api_call POST "/api/v1/friends/sessions" "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"self quant\",\"perFriendPlans\":[{\"friendId\":\"$FRIEND_USER_ID\",\"subjectName\":\"lrdi\",\"topic\":\"friend quant\"}],\"durationMin\":45,\"mood\":\"4\",\"startedAt\":\"2026-04-20T06:00:00Z\"}" >/dev/null
FRIEND_SESSIONS="$(friend_api_call GET "/api/v1/sessions")"
if ! printf "%s" "$FRIEND_SESSIONS" | jq -e '.[] | select(.topic == "friend quant")' >/dev/null; then
  echo "[ERROR] Friend session was not created for friend user."
  exit 1
fi
SELF_SESSIONS="$(api_call GET "/api/v1/sessions")"
if ! printf "%s" "$SELF_SESSIONS" | jq -e '.[] | select(.topic == "self quant")' >/dev/null; then
  echo "[ERROR] Friend session was not created for self user."
  exit 1
fi
LEADERBOARD="$(api_call GET "/api/v1/friends/leaderboard")"
if ! printf "%s" "$LEADERBOARD" | jq -e --arg fid "$FRIEND_USER_ID" '.[] | select(.userId == $fid)' >/dev/null; then
  echo "[ERROR] Friend leaderboard missing friend user."
  exit 1
fi
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
api_call POST "/api/v1/friends/sessions" "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"friend current week\",\"durationMin\":12,\"mood\":\"4\",\"startedAt\":\"$CURR_WEEK_STARTED_AT\"}" >/dev/null
api_call POST "/api/v1/friends/sessions" "{\"friendIds\":[\"$FRIEND_USER_ID\"],\"subjectName\":\"quant\",\"topic\":\"friend previous week\",\"durationMin\":7,\"mood\":\"4\",\"startedAt\":\"$PREV_WEEK_STARTED_AT\"}" >/dev/null
LEADERBOARD_CURRENT="$(api_call GET "/api/v1/friends/leaderboard?weekOffset=0")"
LEADERBOARD_PREVIOUS="$(api_call GET "/api/v1/friends/leaderboard?weekOffset=-1")"
CURRENT_WEEK_MINUTES="$(printf "%s" "$LEADERBOARD_CURRENT" | jq -r --arg uid "$USER_ID" '[.[] | select(.userId == $uid)][0].weeklyMinutes // 0')"
PREV_WEEK_MINUTES="$(printf "%s" "$LEADERBOARD_PREVIOUS" | jq -r --arg uid "$USER_ID" '[.[] | select(.userId == $uid)][0].weeklyMinutes // 0')"
if [[ "$CURRENT_WEEK_MINUTES" -lt 12 ]]; then
  echo "[ERROR] Week offset current leaderboard missing expected minutes."
  exit 1
fi
if [[ "$PREV_WEEK_MINUTES" -lt 7 ]]; then
  echo "[ERROR] Week offset previous leaderboard missing expected minutes."
  exit 1
fi
api_call PUT "/api/v1/timer-state" '{"state":{"mode":"stopwatch","subjectId":"'"$SUBJECT_ID"'","topic":"E2E Timer","isRunning":true}}' >/dev/null
TIMER_STATE="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$TIMER_STATE" | jq -r '.state.topic')" != "E2E Timer" ]]; then
  echo "[ERROR] Timer state round-trip failed."
  exit 1
fi
api_call PUT "/api/v1/timer-state" '{"state":{"timerType":"friend","sessionMode":"live","subjectName":"QUANT","topic":"friend live","friendIds":["'"$FRIEND_USER_ID"'"],"hasStarted":true,"isRunning":true}}' >/dev/null
FRIEND_TIMER_STATE="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$FRIEND_TIMER_STATE" | jq -r '.state.timerType')" != "friend" ]]; then
  echo "[ERROR] Friend timer state payload was not persisted."
  exit 1
fi
TIMER_START="$(api_call POST "/api/v1/timer-state/start")"
if [[ "$(printf "%s" "$TIMER_START" | jq -r '.startedAtMs | numbers')" == "" ]]; then
  echo "[ERROR] Timer start endpoint did not return startedAtMs."
  exit 1
fi
api_call DELETE "/api/v1/timer-state" >/dev/null
TIMER_EMPTY="$(api_call GET "/api/v1/timer-state")"
if [[ "$(printf "%s" "$TIMER_EMPTY" | jq -r '.state')" != "null" ]]; then
  echo "[ERROR] Timer state was not cleared."
  exit 1
fi
api_call DELETE "/api/v1/subjects/$SUBJECT_ID" >/dev/null
CASCaded_LIST="$(api_call GET "/api/v1/sessions")"
if printf "%s" "$CASCaded_LIST" | jq -e --arg sid "$SESSION_ID" '.[] | select(.id == $sid)' >/dev/null; then
  echo "[ERROR] Session still exists after deleting its subject; cascade delete failed."
  exit 1
fi
api_call DELETE "/api/v1/goals/$GOAL_ID" >/dev/null
api_call DELETE "/api/v1/exam-goal" >/dev/null
EXAM_GOAL_AFTER_DELETE="$(api_call GET "/api/v1/exam-goal")"
if [[ "$(printf "%s" "$EXAM_GOAL_AFTER_DELETE" | jq -r '.examGoal')" != "null" ]]; then
  echo "[ERROR] Exam goal was not cleared after delete."
  exit 1
fi

echo "[INFO] Running refresh token rotation + logout flow..."
RAW_REFRESH="refresh-e2e-token"
REFRESH_HASH="$(printf "%s" "$RAW_REFRESH" | shasum -a 256 | awk '{print $1}')"
docker compose exec -T postgres psql -U karma -d karma_yogi -c \
  "INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at)
   VALUES ('22222222-2222-2222-2222-222222222222','$USER_ID','$REFRESH_HASH', now() + interval '1 day')
   ON CONFLICT (id) DO UPDATE SET token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at, revoked_at=NULL;" >/dev/null

REFRESH_RESP="$(curl -fsS -X POST "http://localhost:8080/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshId":"22222222-2222-2222-2222-222222222222","refreshToken":"refresh-e2e-token"}')"
NEW_REFRESH_ID="$(printf "%s" "$REFRESH_RESP" | jq -r '.refreshId')"
curl -fsS -X POST "http://localhost:8080/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refreshId\":\"$NEW_REFRESH_ID\"}" >/dev/null

echo "[INFO] Verifying Nginx path and Google invalid-token behavior..."
curl -fsS "http://localhost/api/v1/users/me" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null
INVALID_CODE="$(curl -sS -o /dev/null -w "%{http_code}" -X POST "http://localhost:8080/api/v1/auth/google" -H "Content-Type: application/json" -d '{"token":"invalid-token"}')"
if [[ "$INVALID_CODE" != "401" ]]; then
  echo "[ERROR] Expected /auth/google invalid token to return 401, got $INVALID_CODE"
  exit 1
fi

echo "[PASS] E2E checks completed successfully."
echo "[PASS] /users/me: $(printf "%s" "$ME" | jq -r '.email')"
echo "[PASS] /sessions count: $(printf "%s" "$SESSION_LIST" | jq 'length')"
echo "[PASS] /goals count: $(printf "%s" "$GOAL_LIST" | jq 'length')"
echo "[PASS] /insights totalMinutes: $(printf "%s" "$INSIGHTS" | jq -r '.totalMinutes')"
