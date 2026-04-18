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

echo "[INFO] Running authenticated API flow..."
ME="$(api_call GET "/api/v1/users/me")"
SUBJECT_NAME="E2E Subject $(date +%s)"
SUBJECT_CREATE="$(api_call POST "/api/v1/subjects" "{\"name\":\"$SUBJECT_NAME\",\"color\":\"cyan\"}")"
SUBJECT_ID="$(printf "%s" "$SUBJECT_CREATE" | jq -r '.id')"
SESSION_CREATE="$(api_call POST "/api/v1/sessions" "{\"subjectId\":\"$SUBJECT_ID\",\"topic\":\"Algebra\",\"durationMin\":45,\"mood\":\"4\",\"startedAt\":\"2026-04-16T06:00:00Z\"}")"
SESSION_ID="$(printf "%s" "$SESSION_CREATE" | jq -r '.id')"
SESSION_UPDATE="$(api_call PATCH "/api/v1/sessions/$SESSION_ID" "{\"topic\":\"Algebra Updated\",\"durationMin\":60,\"mood\":\"5\",\"startedAt\":\"2026-04-16T07:00:00Z\"}")"
UPDATED_DURATION="$(printf "%s" "$SESSION_UPDATE" | jq -r '.durationMin')"
SESSION_LIST="$(api_call GET "/api/v1/sessions")"
GOAL_CREATE="$(api_call POST "/api/v1/goals" '{"title":"Weekly Goal","targetMinutes":300,"deadline":"2026-05-16T00:00:00Z"}')"
GOAL_ID="$(printf "%s" "$GOAL_CREATE" | jq -r '.id')"
GOAL_UPDATE="$(api_call PATCH "/api/v1/goals/$GOAL_ID" '{"title":"Weekly Goal Updated","targetMinutes":360,"deadline":"2026-05-20T00:00:00Z"}')"
GOAL_LIST="$(api_call GET "/api/v1/goals")"
INSIGHTS="$(api_call GET "/api/v1/insights")"
api_call DELETE "/api/v1/subjects/$SUBJECT_ID" >/dev/null
CASCaded_LIST="$(api_call GET "/api/v1/sessions")"
if printf "%s" "$CASCaded_LIST" | jq -e --arg sid "$SESSION_ID" '.[] | select(.id == $sid)' >/dev/null; then
  echo "[ERROR] Session still exists after deleting its subject; cascade delete failed."
  exit 1
fi
api_call DELETE "/api/v1/goals/$GOAL_ID" >/dev/null

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
