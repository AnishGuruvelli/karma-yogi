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

echo "[INFO] Seeding deterministic E2E user..."
docker compose exec -T postgres psql -U karma -d karma_yogi -c \
  "INSERT INTO users (id,email,full_name,avatar_url,google_sub)
   VALUES ('11111111-1111-1111-1111-111111111111','e2e@example.com','E2E User','','e2e-sub')
   ON CONFLICT (id) DO UPDATE SET full_name=EXCLUDED.full_name, email=EXCLUDED.email, avatar_url=EXCLUDED.avatar_url, google_sub=EXCLUDED.google_sub;" >/dev/null

JWT_SECRET_VALUE="$(grep -E '^JWT_SECRET=' .env | sed 's/^JWT_SECRET=//')"
if [[ -z "${JWT_SECRET_VALUE}" ]]; then
  echo "[ERROR] JWT_SECRET is empty in .env"
  exit 1
fi

ACCESS_TOKEN="$(
  JWT_SECRET="$JWT_SECRET_VALUE" python3 - <<'PY'
import base64, hashlib, hmac, json, os, time
secret = os.environ["JWT_SECRET"].encode()
header = {"alg":"HS256","typ":"JWT"}
payload = {
  "userId":"11111111-1111-1111-1111-111111111111",
  "email":"e2e@example.com",
  "sub":"11111111-1111-1111-1111-111111111111",
  "iat": int(time.time()),
  "exp": int(time.time()) + 900
}
def b64(o):
  return base64.urlsafe_b64encode(json.dumps(o, separators=(",", ":")).encode()).rstrip(b"=").decode()
head = b64(header)
body = b64(payload)
msg = f"{head}.{body}".encode()
sig = base64.urlsafe_b64encode(hmac.new(secret, msg, hashlib.sha256).digest()).rstrip(b"=").decode()
print(f"{head}.{body}.{sig}")
PY
)"

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
   VALUES ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','$REFRESH_HASH', now() + interval '1 day')
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
