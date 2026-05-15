# Karma Yogi — Product Requirements Document

**Version:** 1.0  
**Author:** Anish Guruvelli
**Status:** Living document — updated as features ship  
**Last Updated:** 2026-05-08

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Market Context](#3-market-context)
4. [Target Users & Personas](#4-target-users--personas)
5. [Product Vision & North Star](#5-product-vision--north-star)
6. [Goals & Success Metrics](#6-goals--success-metrics)
7. [Scope & Phasing](#7-scope--phasing)
8. [Functional Requirements](#8-functional-requirements)
   - 8.1 Authentication & Onboarding
   - 8.2 Dashboard
   - 8.3 Study Timer
   - 8.4 Session Logging
   - 8.5 Session Library
   - 8.6 Insights & Analytics
   - 8.7 Subjects / Library
   - 8.8 Friends & Social
   - 8.9 Leaderboard
   - 8.10 Profile & Public Profile
   - 8.11 Achievements
   - 8.12 Goals & Exam Countdown
   - 8.13 Strategy Dashboard
   - 8.14 Settings (Preferences & Privacy)
   - 8.15 Theming
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [API & Data Model Summary](#10-api--data-model-summary)
11. [Platform Coverage](#11-platform-coverage)
12. [User Flows](#12-user-flows)
13. [Edge Cases & Error States](#13-edge-cases--error-states)
14. [Security & Privacy](#14-security--privacy)
15. [Known Gaps & Constraints](#15-known-gaps--constraints)
16. [Future Roadmap](#16-future-roadmap)
17. [Appendix — Glossary](#17-appendix--glossary)

---

## 1. Executive Summary

Karma Yogi is a cross-platform study-tracking application that helps students log, measure, and improve their study habits. Users record sessions manually or via a live timer, visualise progress through heatmaps and charts, set exam and weekly goals, and hold themselves accountable through a friend network and weekly leaderboard.

The product runs as a responsive web app (React + Vite, hosted on Render) and a native Android wrapper (Capacitor). The backend is a Go REST API backed by PostgreSQL. Both surfaces share one codebase and one API contract.

The core insight: **most study apps are either passive trackers or rigid schedulers**. Karma Yogi sits in the middle — it gives students a clean, motivating record of their effort without forcing them into a fixed timetable. The social layer (friends + leaderboard + shared sessions) adds accountability that solo-only tools lack.

---

## 2. Problem Statement

### 2.1 The Student's Pain

Competitive exam aspirants (UPSC, CAT, GATE, JEE, NEET, CA, bar exams, etc.) and university students face three intertwined problems:

| Problem | Symptom | Impact |
|---|---|---|
| **Effort is invisible** | Students feel busy but can't quantify actual focused hours | Burnout without progress signal; no feedback loop |
| **Motivation decays in isolation** | No accountability partner; no social proof of effort | Dropout from study routines, especially during low-motivation weeks |
| **Planning is disconnected from execution** | Students plan ambitious schedules but can't see where time actually went | Repeated under-performance on timed milestones (mock tests, exams) |

### 2.2 Existing Solutions and Why They Fall Short

| Tool | Strength | Gap |
|---|---|---|
| Forest / Be Focused | Good focus timer | No subject breakdown, no social, no analytics |
| Notion / spreadsheets | Flexible logging | Manual friction; no real-time timer; no built-in social |
| Toggl / Clockify | Strong analytics | Built for professionals, not students; no exam context |
| StudyTogether.com | Social co-studying | No personal tracking; purely ambient presence |
| Physical planners | Ritual value | No data; can't build analytics on paper |

Karma Yogi's differentiator: **lightweight logging + subject-level analytics + social accountability + exam-countdown framing**, all in a mobile-first, beautifully themed app.

---

## 3. Market Context

### 3.1 Target Market

- **Primary:** Indian competitive exam aspirants (UPSC, CAT, GATE, JEE, NEET, CA Foundation/Final) — estimated 10M+ active test-takers per year in India alone.
- **Secondary:** University students globally who self-direct their study, especially those in rigorous programs (engineering, law, medicine, finance).
- **Tertiary:** High-school students preparing for board exams or entrance tests.

### 3.2 Distribution

- Android (Play Store via Capacitor wrapper) — primary mobile surface for Indian market
- Web app (karma-yogi-web.onrender.com) — discovery, desktop use, low-friction demo
- iOS packaging is structurally supported (Capacitor) but not yet published

### 3.3 Pricing

Current state: free. Future monetisation (out of scope for v1) would likely be premium themes, AI study plan generation, advanced analytics exports, or a team/institution tier.

---

## 4. Target Users & Personas

### Persona 1 — "The Aspirant" (Primary)

**Aditya, 24, Delhi**  
Preparing for UPSC Civil Services (2-year preparation cycle). Studies 10–14 hours/day across 8 subjects. Highly motivated but struggles with consistency during slumps. Lives with family; uses phone for everything. Has a study group of 4 friends also preparing.

**Goals:** track daily hours, ensure no subject is neglected, beat friends in weekly hours, know how many days until prelims.  
**Pains:** forgetting to log sessions, losing streak after one bad day, not knowing which subject got short-changed.  
**Usage pattern:** opens app morning and night; logs sessions via timer; checks leaderboard every Sunday.

---

### Persona 2 — "The University Student" (Secondary)

**Priya, 21, Bangalore**  
Engineering student balancing 5 courses + project work. Uses laptop more than phone. Studies in Pomodoro blocks of 25 minutes. Wants to know if she's hitting 6 hours/day before exams.

**Goals:** weekly goal ring, heatmap to see dead days, Pomodoro timer.  
**Pains:** forgets to start/stop timer; wants to see subject pie chart before exams.  
**Usage pattern:** timer on laptop; sessions page on phone.

---

### Persona 3 — "The Social Studier" (Secondary)

**Rohan, 22, Mumbai**  
CAT aspirant who studies with two close friends over video call. Wants a shared session feature so all three get credit without separate logging. Motivated by leaderboard rank.

**Goals:** start friend sessions, see friend profiles, maintain top leaderboard position.  
**Usage pattern:** daily; heavy Friends tab use.

---

### Persona 4 — "The Casual Tracker" (Tertiary)

**Ananya, 19, Pune**  
1st-year college student who logs sessions when she remembers. Opened the app because a friend referred her. Not chasing an exam date.

**Goals:** build a study habit; see a heatmap fill up.  
**Usage pattern:** 3–4 sessions/week; mostly Dashboard.

---

## 5. Product Vision & North Star

**Vision:** Become the de-facto study accountability platform for Indian competitive exam aspirants — the app every serious student has open alongside their textbook.

**North Star Metric:** Weekly Active Studiers (WAS) — users who log at least 3 study sessions in a given week.

**Supporting metrics:** average sessions per active user per week, D7 retention, social graph density (avg friends per user), weekly goal completion rate.

---

## 6. Goals & Success Metrics

### 6.1 Product Goals

| # | Goal | Rationale |
|---|---|---|
| G1 | Reduce logging friction to under 15 seconds | If logging is slow, users skip it. The timer and quick-log modal must be instant. |
| G2 | Make progress legible at a glance | Dashboard must communicate today's hours, weekly goal, streak, and subject balance in one screen. |
| G3 | Create meaningful social pressure | Leaderboard and shared sessions must make accountability real without being gamified to the point of gaming. |
| G4 | Respect privacy by default | Not every user wants their stats visible. Privacy controls must be first-class, not buried. |
| G5 | Work offline-tolerant on Android | Competitive exam aspirants often study in areas with poor connectivity. |

### 6.2 Success Metrics by Feature Area

| Feature | Metric | Target (90-day) |
|---|---|---|
| Session logging | % of users logging ≥1 session in their first week | ≥60% |
| Timer | % of logged minutes that come from timer vs manual | ≥40% |
| Weekly goal | % of active users who set a weekly goal | ≥70% |
| Exam goal | % of active users who set an exam goal | ≥50% |
| Friends | % of users with ≥1 confirmed friend | ≥35% |
| Leaderboard | % of users who view leaderboard ≥3x/week | ≥25% |
| Streak | % of users with current streak ≥7 days | ≥20% |
| Themes | % of users who change from the default theme | ≥30% |
| D7 retention | Users who return after 7 days | ≥40% |

---

## 7. Scope & Phasing

### Phase 1 — Core Tracker (Shipped)

- Auth (email/password + Google OAuth)
- Session logging (manual + timer)
- Subjects with color coding
- Dashboard (today metrics, weekly goal ring, streak, heatmap, recent sessions)
- Sessions page (full log, search, filter, edit/delete)
- Insights (weekly chart, subject pie, peak hour, best day)
- Profile (account settings, public profile metadata)
- Achievements (10 milestone badges)
- Exam goal + countdown card
- Themes (5 color palettes)
- Android Capacitor wrapper

### Phase 2 — Social Layer (Shipped)

- Friends (discover, send/accept/reject requests)
- Weekly leaderboard (current + previous weeks)
- Friend sessions (shared session logging with per-friend subject overrides)
- Public profile view (privacy-gated stats, heatmap, session list)
- Privacy controls (profilePublic, showStats, showLeaderboard)

### Phase 3 — Strategy & Intelligence (In Progress / Gated)

- Strategy Dashboard (`showStrategyPage` preference flag; per-account opt-in)
- Study blueprint recommendations

### Phase 4 — Future (Roadmap)

- Push notifications (streak reminders, friend activity)
- iOS App Store distribution
- AI-generated study plans
- Group study rooms
- Offline-first mode with sync
- Institutional/team tier

---

## 8. Functional Requirements

### 8.1 Authentication & Onboarding

#### 8.1.1 Registration

**Flow:** Email + full name + password + security answer → account created → tokens issued → redirect to Dashboard.

**Requirements:**
- Email must be unique (conflict returns HTTP 409).
- Password minimum: 8 characters. No maximum specified.
- Security answer is stored as a bcrypt hash and is used for password reset (no email verification required).
- Client displays a single standard security question; the specific question text is defined in `frontend/src/lib/auth-constants.ts`.
- Full name minimum: 2 characters.
- On success the API returns `{ user, accessToken, refreshId, refreshToken }` — the client stores tokens in `localStorage`.
- Auto-generate a username slug from `fullName` (server responsibility); user can later change it in Profile.

**Acceptance criteria:**
- AC1: Attempting to register with an already-used email shows a user-friendly "email already registered" message.
- AC2: Weak password (< 8 chars) is caught client-side before the API call.
- AC3: Successful registration lands the user on Dashboard with data loaded.
- AC4: Tokens persist across page refresh (stored in localStorage).

#### 8.1.2 Login

**Flow:** Email + password → JWT access token + refresh token pair.

**Requirements:**
- "Remember me" option: when checked, the refresh token TTL is 30 days (default). When not checked, the session is effectively session-length (handled by the client clearing tokens on tab close — not a backend concern in v1).
- Invalid credentials return a generic "invalid email or password" message (never reveal which field is wrong).
- Concurrent tab refresh protection: if two tabs both hit a 401, only one refresh request is made; the second waits on the first's promise.

#### 8.1.3 Google OAuth

**Flow (Web):** Google Identity Services `credential` callback → ID token → `POST /auth/google` → same AuthResult as email login.

**Flow (Android):** Native Capacitor Google Auth plugin → ID token → same backend endpoint.

**Requirements:**
- Backend verifies token signature against Google's public keys using `GOOGLE_CLIENT_ID`.
- If the Google email is not yet registered, a new account is auto-created (no security answer on Google accounts — password reset is not available for Google-auth accounts in v1).
- On Android, Google Sign-In must work without a browser redirect.

#### 8.1.4 Password Reset

**Flow:** Email + security answer + new password → password updated, no email step.

**Requirements:**
- No authentication required (public endpoint).
- Incorrect security answer returns HTTP 401 with a generic message (same as wrong email — never reveal which is wrong).
- New password minimum 8 characters enforced server-side.
- After reset, all existing refresh tokens for the user should be invalidated (v1: at minimum the user must re-login; full invalidation is a security hardening item).

#### 8.1.5 Token Lifecycle

| Token | Type | TTL | Storage |
|---|---|---|---|
| Access | Short-lived JWT (HS256) | 15 min (configurable) | `localStorage` |
| Refresh | Opaque UUID (SHA-256 hash stored in DB) | 720 h / 30 days | `localStorage` |

- Access token sent as `Authorization: Bearer <token>` on every authenticated request.
- On 401, client calls `POST /auth/refresh` with `{ refreshId, refreshToken }`.
- Refresh is one-shot: each call rotates the refresh token (new `refreshId` + new `refreshToken`; old pair revoked).
- Using a revoked refresh token returns HTTP 401 → client clears tokens and redirects to Login.
- Rate limit: 180 req/min per IP (global, enforced in backend middleware).

#### 8.1.6 Logout

- Client calls `POST /auth/logout` with `{ refreshId }` to revoke the server-side refresh record.
- Client then clears localStorage tokens regardless of API response.
- User is redirected to Login.

---

### 8.2 Dashboard

The Dashboard (`/`) is the primary landing page after login. It must communicate the user's study status at a glance with zero navigation.

#### 8.2.1 Greeting & Quote

- Time-based greeting: "Good Morning" (< 12:00), "Good Afternoon" (12–17), "Good Evening" (≥ 17).
- Daily rotating motivational quote (deterministic rotation based on day — same quote all day for a user).
- Displays user's first name.

#### 8.2.2 Today's Study Card

- Total minutes studied today (local date boundary).
- Number of sessions today.
- Formatted as hours + minutes when ≥ 60 minutes (e.g. "1h 30m").
- No sessions today → shows "0m" with a gentle empty-state prompt.

#### 8.2.3 Weekly Goal Ring

- Circular progress ring showing this week's minutes vs weekly goal (target hours × 60).
- Week boundary: Monday–Sunday (local calendar).
- Ring fills clockwise; color follows the active theme accent.
- Center label shows minutes studied this week.
- Tapping the ring opens `GoalEditModal` to change the weekly target.
- Goal is expressed in hours in the UI (e.g. "20h / week") but stored in minutes server-side.
- If no goal is set, prompt user to set one; default is 20h (set at account creation via preferences).

#### 8.2.4 Current Streak

- Consecutive days with at least one logged session.
- Streak uses local calendar date from `session.startedAt`.
- If today has no sessions yet but yesterday had at least one, streak is "at risk" (still counted, but not yet extended).
- Displays days count + flame icon.
- Lost streak (gap day): resets to 0.

#### 8.2.5 Weekly Subject Breakdown

- Horizontal bar or stacked breakdown showing hours per subject this week.
- Only shows subjects with minutes > 0 this week.
- Uses subject color (theme-aware accent palette).
- Subjects with zero minutes this week are listed as "0m" below in a "not yet studied" section (so users see which subjects they're neglecting).

#### 8.2.6 Exam Countdown Card

- Shown only if the user has set an exam goal.
- Displays exam name + days remaining.
- If exam date is in the past, card shows "Exam date passed" and prompts to clear or update.
- Tapping the card opens `ExamGoalModal` (2-step: set name → set date).

#### 8.2.7 Recent Sessions

- Last 10 sessions (ordered by `startedAt` descending).
- Each entry shows: subject color chip, subject name, topic (truncated if long), date, duration, mood emoji.
- Inline edit (pencil icon) → opens `LogSessionModal` pre-filled with session data.
- Inline delete (trash icon) → confirmation toast → `DELETE /sessions/{id}` → `reloadStoreData()`.
- Swipe-to-delete on mobile is a stretch goal (not in v1).

#### 8.2.8 Heatmap Card (Activity Calendar)

- GitHub-style activity heatmap: one cell per day, intensity = minutes studied.
- Shows from the first session month through today + current partial month.
- Scrolls horizontally on mobile; overflow-y must be hidden to avoid scroll bleeding.
- Portal tooltip on hover/tap showing date + minutes.
- Cells use theme accent colors at 4 intensity levels (0, low, medium, high) based on percentile breakpoints relative to the user's max day.

#### 8.2.9 Action Buttons

- **Begin Session** — opens `TimerModal`.
- **Log Session** — opens `LogSessionModal` (manual entry without timer).
- Both buttons are full-width on mobile; side-by-side on desktop.

---

### 8.3 Study Timer

The timer is the primary real-time session entry surface.

#### 8.3.1 Modes

| Mode | Behaviour |
|---|---|
| **Stopwatch** | Counts up from 0. Stop = log a session of elapsed duration. |
| **Pomodoro** | Counts down from `defaultSessionMinutes` (preference; default 50 min). On expiry, automatically transitions to a break countdown (`breakMinutes` preference; default 10 min). Cycles repeat up to `pomodoroCycles` (preference; default 4) before a long break prompt. |

#### 8.3.2 Configuration (per session)

- **Subject** — required; dropdown of user's subjects.
- **Topic** — optional free text (e.g. "Chapter 12 — Rivers of India").
- **Mood** — selected before stopping the timer (1–5 emoji scale).
- **Duration override** — in Pomodoro mode the user can adjust session length before starting.

#### 8.3.3 Start / Pause / Resume / Stop

- **Start:** client calls `POST /timer-state/start` to get a server-authoritative `startedAtMs` timestamp. This prevents client clock drift from inflating session times on the leaderboard.
- **Pause:** stores elapsed time locally; timer UI freezes. Timer state is persisted to `PUT /timer-state` so pause survives a page refresh.
- **Resume:** resumes from elapsed offset; server-authoritative start is re-issued.
- **Stop (complete):** opens a confirmation/mood-capture step, then calls `POST /sessions` and `DELETE /timer-state`.
- **Discard:** cancels without logging. Clears timer state.

#### 8.3.4 Persistence Across Navigation

- Active timer state is saved to `PUT /timer-state` on every meaningful state change (start, pause, resume, mode switch).
- On app load, `GET /timer-state` is called; if state exists, the timer is restored to its last state (running or paused).
- Friend session payloads are also persisted via the same endpoint (`timerType: "friend"`).

#### 8.3.5 Friend Timer Mode

- Before starting, user can switch to "Friend Session" mode and select friends from their confirmed friend list.
- Each friend can have an independent subject + topic override.
- On stop, calls `POST /friends/sessions` which logs one session per participant (caller + all selected friends).
- Friend mode requires at least one confirmed friend; empty friend list shows a prompt to add friends first.
- Live elapsed time display for each participant (based on shared `startedAtMs`).

---

### 8.4 Session Logging (Manual)

`LogSessionModal` is the manual session entry form. Used when the user studied without the app open (retroactive logging).

#### 8.4.1 Fields

| Field | Type | Required | Default |
|---|---|---|---|
| Subject | Dropdown (user's subjects) | Yes | Last used subject |
| Topic | Text input | No | Empty |
| Duration | Number input (minutes) | Yes | `defaultSessionMinutes` preference |
| Mood | 1–5 emoji picker | Yes | None pre-selected |
| Date | Date picker | Yes | Today |

#### 8.4.2 Behaviour

- Submitting calls `POST /sessions` → `reloadStoreData()` → modal closes → toast "Session logged".
- Edit mode: pre-fills all fields from existing session; submits `PATCH /sessions/{id}`.
- Subject dropdown shows all user subjects; "Add subject" shortcut navigates to DataPage.
- Duration input must be ≥ 1 minute; client-side validation before API call.
- Date picker must not allow future dates (studying hasn't happened yet).

---

### 8.5 Session Library (Sessions Page)

Route `/sessions`. Full list of all logged sessions with search and filter.

#### 8.5.1 List

- Ordered by `startedAt` descending (most recent first).
- Default page size: 30 sessions (server returns all; pagination is client-side in v1).
- Each row: subject color chip, subject name, topic, date, duration, mood emoji.
- Edit / delete inline (same as Dashboard recent sessions).

#### 8.5.2 Search

- Real-time client-side filter on subject name + topic text.
- Clears results gracefully with an empty state message.

#### 8.5.3 Filter

- Filter by subject (multi-select).
- Filter by date range (from / to date pickers).
- Filter by mood (1–5 emoji checkboxes) — stretch goal for v1.
- Active filters are shown as dismissible chips.

#### 8.5.4 Bulk Delete

- Stretch goal for v1. Not included in initial scope.

---

### 8.6 Insights & Analytics

Route `/insights`. Aggregated visualisations of the user's study history.

#### 8.6.1 Heatmap

- Same component as Dashboard heatmap (`HeatmapCard`).
- Full-width on Insights page; shows complete history.

#### 8.6.2 Weekly Bar Chart (`WeeklyStats`)

- 7-day bar chart (Mon–Sun) for the selected week.
- Week navigation: < (previous) and > (next) arrows; "Today" pill to jump back.
- Y-axis in hours; each bar labelled with day abbreviation.
- Bars colored by theme accent.
- Subject breakdown tooltip on tap/hover.

#### 8.6.3 Subject Pie / Breakdown

- Proportional breakdown of total minutes by subject (all-time or current week toggle).
- Subject color matches the user's assigned color.
- Legend shows subject name + percentage + hours.

#### 8.6.4 Peak Hour

- Hour of day (0–23 local time) with the highest total minutes.
- Displayed as a "peak study time" stat card.
- Derived server-side from `GET /insights` or computed client-side from session data.

#### 8.6.5 Best Day

- Calendar date with the highest single-day study total.
- Displayed as a stat card with the date + minutes.

#### 8.6.6 All-Time Stats

- Total hours logged (all time).
- Total sessions.
- Average session length.
- Longest single session.
- Average mood (1–5).
- Active days (days with ≥ 1 session).

---

### 8.7 Subjects / Library (Data Page)

Route `/data`. Manage the user's subject list.

#### 8.7.1 Subject List

- All subjects shown as cards with: name, color chip, session count.
- Sorted by creation date (oldest first) or by usage (most sessions first) — v1: creation date.

#### 8.7.2 Add Subject

- Inline form or modal: name + color selector (5 colors: cyan, green, orange, pink, purple).
- Submits `POST /subjects`.
- Duplicate name: client warns but does not block (server does not enforce uniqueness on name).

#### 8.7.3 Edit Subject Color

- Tap the color chip to cycle or open a color picker.
- Submits `PATCH /subjects/{id}` with new color.
- Color change is reflected immediately across all session cards via store update.

#### 8.7.4 Delete Subject

- Confirmation dialog: "Deleting this subject will delete all X sessions under it. This cannot be undone."
- Submits `DELETE /subjects/{id}`.
- Backend cascades: all sessions with `subjectId` matching are deleted.
- After delete, store is refreshed; sessions under deleted subject disappear from all views.

---

### 8.8 Friends & Social

Route `/friends`. Tabs: Leaderboard | Friends | Discover | Requests.

#### 8.8.1 Discover Tab

- Lists all registered users (excluding the current user) with their friendship status: `none`, `incoming`, `outgoing`, `friends`.
- Search bar: real-time filter by name, username, or email.
- Each user card shows: avatar/initials, full name, username.
- Action button varies by status:
  - `none` → "Add Friend" → `POST /friends/requests`
  - `outgoing` → "Pending" (disabled, shows request was sent)
  - `incoming` → "Accept" / "Decline" buttons
  - `friends` → "Friends" badge; tapping navigates to their public profile

#### 8.8.2 Friend Requests Tab

- **Incoming sub-list:** pending requests where the current user is the receiver. Accept / Reject buttons.
- **Outgoing sub-list:** pending requests sent by the current user (for awareness; no action needed).
- Accepting a request: `POST /friends/requests/{id}/accept` → friendship is confirmed → leaderboard updates.
- Rejecting: `POST /friends/requests/{id}/reject` → request disappears from both parties' lists.
- Badge count on the tab label showing pending incoming count.

#### 8.8.3 Friends Tab

- Confirmed friends list.
- Each card: avatar, name, username.
- Tap → navigate to `/friends/{userId}` (Public Profile page).
- "Start Session Together" button on each card → opens TimerModal in friend-session mode pre-populated with that friend.

#### 8.8.4 Shared / Friend Sessions

- Accessed from the Timer Modal when in "Friend" mode, or via a quick-start button on a friend card.
- User selects which friends to include.
- User sets their own subject + topic; optionally overrides per friend.
- Duration, mood, and start time are shared across all participants.
- On completion: `POST /friends/sessions` logs one session for the caller and one per `friendId`.
- Friends see the session appear in their own sessions list with the subject/topic set for them.
- Past friend sessions (manual logging of a collaborative session without using the live timer) are also supported via the `LogSessionModal`.

---

### 8.9 Leaderboard

Tab within `/friends`. Weekly ranking of the current user and all confirmed friends by minutes studied.

#### 8.9.1 Ranking

- Ordered by `weeklyMinutes` descending.
- Week boundary: Monday–Sunday UTC.
- Current user's row is always highlighted.
- Rank number shown (1st, 2nd, 3rd with medal icons; 4th+ with ordinal number).
- Minutes displayed as formatted hours (e.g. "12.5h").

#### 8.9.2 Week Navigation

- Default: current week.
- Back arrow (< ) navigates to previous week. Forward arrow is disabled for current week.
- Week label: "May 5 – May 11" format.
- Navigation calls `GET /friends/leaderboard?weekOffset=-1` etc.

#### 8.9.3 Privacy Filtering

- Users who have `showLeaderboard = false` in privacy settings are excluded from the leaderboard results (server enforces this).
- Users who have `profilePublic = false` may still appear on the leaderboard (leaderboard only shows name + minutes, not full profile).

---

### 8.10 Profile & Public Profile

#### 8.10.1 My Profile (`/profile`)

**Account section:**
- Full name (editable)
- Username (editable; must be unique — server returns 409 on conflict)
- Email (read-only — cannot be changed in v1)
- Phone (editable, optional)
- Avatar URL (editable, optional)

**Public profile metadata:**
- Bio (free text, ~160 chars)
- Location
- Education (e.g. "IIT Delhi")
- Occupation
- Target exam (e.g. "UPSC CSE 2026")
- Target college

All fields optional. Saved via `PATCH /users/me/public-profile`.

**Study stats summary** (from `GET /users/me/study-stats`):
- Total hours, total sessions, active days, current streak, avg session length, avg mood, this week's hours.

**Achievements panel** — see §8.11.

**Preferences and privacy settings** — see §8.14.

#### 8.10.2 Public Profile (`/friends/:userId`)

Viewed when tapping a friend or a discovered user.

**Always shown (no privacy gate):**
- Avatar, full name, username
- Bio, location, education, targetExam

**Shown only if `canViewDetails = true` (caller is the owner or a confirmed friend):**
- Overview stats: total minutes, sessions, active days, avg session, longest session, this week's minutes, friend count, streak, weekly goal.
- Session list (paginated, 20/page, most recent first).
- Insights: subject breakdown, daily/weekly heatmap, peak hour, best day, most studied subject.
- Calendar heatmap.

**Privacy gates:**
- `profilePublic = false` → overview, sessions, and insights are hidden from non-friends.
- `showStats = false` → stats and insights are hidden even for friends.
- `showLeaderboard = false` → user excluded from friend leaderboard results.

---

### 8.11 Achievements

10 milestone badges, derived at query-time from session + friend data (no separate DB table — computed on `GET /users/me/achievements`).

| Badge Key | Display Name | Condition |
|---|---|---|
| `first_session` | First Step | Log at least 1 session |
| `seven_day_streak` | Week Warrior | 7-day consecutive streak |
| `fourteen_day_warrior` | Fortnight Fighter | 14-day consecutive streak |
| `century_club` | Century Club | 100+ sessions logged |
| `deep_work` | Deep Work | Any single session ≥ 120 minutes |
| `social_studier` | Social Studier | At least 1 confirmed friend |
| `subject_master` | Subject Master | Sessions across 5+ distinct subjects |
| `goal_crusher` | Goal Crusher | Weekly goal reached at least once |
| `early_bird` | Early Bird | Session starting before 07:00 local time |
| `mock_master` | Mock Master | Session with "mock" in the topic |

**Display:** locked badges shown in greyscale with padlock; earned badges shown with color + earned date.

**Streak rule:** day boundaries use UTC calendar dates from `session.startedAt`. A "consecutive" streak means no UTC calendar day gap (each calendar day Mon–Sun must have at least one session).

---

### 8.12 Goals & Exam Countdown

#### 8.12.1 Weekly Goal

- Stored as a `Goal` record with `targetMinutes` (stored as minutes; displayed as hours in UI).
- UI: editable via `GoalEditModal` (tap the weekly ring on Dashboard).
- Only one active goal at a time in v1 (the most recently created goal is used).
- Progress: sum of `durationMin` for all sessions with `startedAt` in the current Mon–Sun week (local time).
- `goal_crusher` achievement is earned when weekly progress ≥ target at any point in history.

#### 8.12.2 Exam Goal

- One exam goal per user (upsert: `PUT /exam-goal`).
- Fields: `name` (e.g. "UPSC Prelims") + `examDate` (date-time).
- Displayed as a countdown card on Dashboard: "47 days to UPSC Prelims".
- If `examDate` is in the past: card shows expired state with a "Update or clear" prompt.
- Clearing calls `DELETE /exam-goal`.
- Setting is a 2-step modal (`ExamGoalModal`): Step 1 = name, Step 2 = date picker (calendar).
- The calendar date picker inside the modal uses `z-[70]` to float above the modal's `z-[60]`.

---

### 8.13 Strategy Dashboard

Route `/strategy-dashboard`. Gated behind `preferences.showStrategyPage = true`.

- This is a per-account opt-in feature currently available to selected users.
- The nav link is conditionally injected into the bottom/top nav only when the preference is enabled.
- When disabled, navigating directly to the route should redirect to Dashboard (or show a locked state).
- Contains `StrategyBlueprint` component which renders a personalised study plan framework.
- Full feature spec to be detailed in a separate strategy PRD (in progress).

---

### 8.14 Settings (Preferences & Privacy)

#### 8.14.1 Study Preferences

Accessed from Profile page.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Preferred study time | String enum | — | "Morning", "Afternoon", "Evening", "Night" |
| Default session minutes | Integer | 50 | Pre-fills timer and manual log duration |
| Break minutes (Pomodoro) | Integer | 10 | Pomodoro break length |
| Pomodoro cycles | Integer | 4 | Number of work cycles before long break |
| Study level | String enum | — | "Beginner", "Intermediate", "Advanced" |
| Weekly goal hours | Integer | 20 | Mirrors the Goal record; updating here updates both |
| Email notifications | Boolean | true | |
| Push notifications | Boolean | false | |
| Reminder notifications | Boolean | false | |
| Marketing notifications | Boolean | false | |
| Show Strategy Page | Boolean | false | Gated unlock — not user-editable in UI unless already enabled |

#### 8.14.2 Privacy Settings

| Setting | Type | Default | Notes |
|---|---|---|---|
| Profile public | Boolean | true | Gates whether non-friends can see stats |
| Show stats | Boolean | true | Gates stats visibility even for friends |
| Show on leaderboard | Boolean | true | Inclusion in friend leaderboard |

---

### 8.15 Theming

Five named themes applied via `data-theme` attribute on `<html>`:

| Theme | Key | Primary accent feel |
|---|---|---|
| Sky | `sky` | Blue / indigo |
| Honey | `honey` | Amber / gold |
| Forest | `forest` | Green / emerald |
| Blossom | `blossom` | Pink / rose |

- All themes define CSS variables for foreground, background, card, border, muted, primary, and accent shades.
- Theme auto-selected from local time on every load: honey (6–12), sky (12–18), forest (18–6). Users can override via ThemePicker; override is session-only (not persisted).
- Theme picker accessible from Profile page (5 color swatches).
- Dark mode is a separate toggle (independent of theme); each theme has light + dark variants via CSS.

---

## 9. Non-Functional Requirements

### 9.1 Performance

| Requirement | Target |
|---|---|
| Dashboard first meaningful paint (web, cold) | < 2 s on 4G |
| API response time (p95, authenticated endpoints) | < 300 ms |
| Session list load (1,000+ sessions) | < 500 ms client-side render |
| Timer tick accuracy | ±1 s drift over 1 hour |
| Heatmap render (3 years of data) | < 100 ms (CSS grid, no canvas) |

### 9.2 Availability

- Backend target: 99.5% uptime (Render free-tier constraint in v1; upgrading to paid tier for production SLA).
- Graceful degradation: if the API is down, the app should show a generic error rather than a blank screen.

### 9.3 Security

- JWT signed with HS256; secret rotated on breach.
- Refresh tokens stored as SHA-256 hashes in Postgres (never raw tokens).
- bcrypt for passwords (cost factor 12+) and security answers.
- All API endpoints require authentication except `/healthz`, `/auth/*`.
- CORS restricted to known origins (never `*` in production).
- Rate limiting: 180 req/min per IP (global middleware).
- Security headers middleware: HSTS, X-Frame-Options, X-Content-Type-Options, etc.
- No secrets in version control; all secrets via environment variables.

### 9.4 Scalability

- Stateless API — horizontal scaling ready (no in-process session state; timer state in DB).
- Database: Postgres on Render; connection pooling via `pgxpool`.
- No caching layer in v1; add Redis for leaderboard caching when friend networks exceed ~500 users.

### 9.5 Accessibility

- All interactive elements must meet WCAG 2.1 AA touch target size (44×44 px on mobile).
- Color contrast: text-foreground on bg-background must meet 4.5:1 ratio across all 5 themes in both light and dark mode.
- Keyboard navigation: all modals must be focusable and closeable with Escape.
- Screen reader: all icon-only buttons must have `aria-label`.

### 9.6 Mobile (Android / Web-Mobile)

- All tap targets: minimum `h-10 w-10` (40px).
- Modals: `items-end sm:items-center` so they slide up from bottom on mobile.
- Body scroll lock on open modals: `useBodyScrollLock(isOpen)` called in every modal.
- Horizontal scroll: always paired with `overflow-y-hidden`.
- Bottom nav clearance: `pb-24` on all page roots.
- No zoom on input focus (meta viewport set correctly).

---

## 10. API & Data Model Summary

### 10.1 Authentication Routes

| Verb | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login |
| POST | `/auth/password-reset` | No | Reset password via security answer |
| POST | `/auth/google` | No | Google ID token exchange |
| POST | `/auth/refresh` | No | Rotate refresh token |
| POST | `/auth/logout` | No | Revoke refresh token |

### 10.2 Core Data Routes (All Require Bearer Token)

| Domain | Verb | Path |
|---|---|---|
| User | GET / PATCH | `/users/me` |
| Stats | GET | `/users/me/study-stats?tz=` |
| Public profile | GET / PATCH | `/users/me/public-profile` |
| Public profile (by username) | GET | `/users/{username}/public-profile` |
| Preferences | GET / PATCH | `/users/me/preferences` |
| Privacy | GET / PATCH | `/users/me/privacy` |
| Achievements | GET | `/users/me/achievements` |
| Subjects | GET / POST | `/subjects` |
| Subject | PATCH / DELETE | `/subjects/{id}` |
| Sessions | GET / POST | `/sessions` |
| Session | PATCH / DELETE | `/sessions/{id}` |
| Goals | GET / POST | `/goals` |
| Goal | PATCH / DELETE | `/goals/{id}` |
| Exam Goal | GET / PUT / DELETE | `/exam-goal` |
| Insights | GET | `/insights` |
| Timer | GET / PUT / DELETE | `/timer-state` |
| Timer Start | POST | `/timer-state/start` |
| Friends (discover) | GET | `/friends/users` |
| Friends (confirmed) | GET | `/friends` |
| Friend Requests | POST | `/friends/requests` |
| Incoming Requests | GET | `/friends/requests/incoming` |
| Outgoing Requests | GET | `/friends/requests/outgoing` |
| Accept Request | POST | `/friends/requests/{id}/accept` |
| Reject Request | POST | `/friends/requests/{id}/reject` |
| Leaderboard | GET | `/friends/leaderboard` |
| Friend Session | POST | `/friends/sessions` |
| Friend Profile | POST | `/friends/friend-profile` |

### 10.3 Key Data Models

**Session**
```
id: UUID
userId: UUID
subjectId: UUID
topic: string (optional)
durationMin: integer (≥ 1)
mood: string "1"–"5"
startedAt: datetime
createdAt: datetime
```

**Subject**
```
id: UUID
name: string
color: "cyan" | "green" | "orange" | "pink" | "purple"
icon: string (optional emoji)
createdAt: datetime
```

**Achievement**
```
key: enum (10 keys)
earned: boolean
earnedAt: datetime | null
```

**TimerState** (free-form JSON blob, key fields)
```
mode: "stopwatch" | "pomodoro"
timerType: "solo" | "friend"
subjectId: UUID
topic: string
isRunning: boolean
isPaused: boolean
hasStarted: boolean
friendIds: UUID[] (friend sessions)
sessionMode: "live" | "plan"
```

---

## 11. Platform Coverage

| Capability | Web | Android (Capacitor) | iOS (future) |
|---|---|---|---|
| Session logging | ✓ | ✓ | — |
| Live timer | ✓ | ✓ | — |
| Google OAuth | Google Identity Services | Native Capacitor Google Auth | — |
| Push notifications | Not yet | Not yet | — |
| Offline session queue | Not yet | Not yet | — |
| App Store distribution | N/A (Render) | In progress | — |
| Platform header sent | `web` | `android` | — |

**Android specifics:**
- App ID: `com.karmayogi.app`
- Target API: 36
- Gradle: 8.14.3; JDK 21 recommended
- Emulator API base: `http://10.0.2.2:8080/api/v1`
- CORS must include `http://localhost` and `capacitor://localhost`

---

## 12. User Flows

### Flow 1 — First-Time User (New Account)

```
Landing / Login page
  → Register tab
  → Fill email, full name, password, security answer
  → POST /auth/register
  → Dashboard (empty state)
  → "Add your first subject" prompt
  → DataPage: create subject (e.g. "Mathematics", cyan)
  → Back to Dashboard
  → "Begin Session" → TimerModal
  → Select subject, set topic
  → POST /timer-state/start → start stopwatch
  → Study for N minutes
  → Stop → mood picker → POST /sessions → toast "Session logged"
  → Dashboard shows today's minutes, streak = 1
```

### Flow 2 — Daily Return (Existing User)

```
App open → auth token valid → Dashboard
  → See streak, today's hours (yesterday's sessions already there)
  → "Begin Session" → TimerModal (subject pre-selected from last session)
  → Start → study → stop → log
  → Dashboard refreshes
  → Check leaderboard in Friends tab
  → Navigate to Insights → check weekly chart
```

### Flow 3 — Friend Session

```
Friends tab → Friends sub-tab
  → Tap friend card → "Study Together"
  → TimerModal opens in Friend mode
  → Select friends (can add multiple)
  → Set own subject/topic
  → Optionally override friend's subject/topic
  → POST /timer-state/start (server timestamp)
  → Study (live elapsed timer shown per participant)
  → Stop → POST /friends/sessions
  → Each participant sees session in their own sessions list
```

### Flow 4 — Retroactive Manual Log

```
Sessions tab → "Log Session" (+ button)
  → LogSessionModal
  → Pick subject, enter topic, set duration (e.g. 90)
  → Pick mood
  → Change date to yesterday
  → Save → POST /sessions
  → Sessions list refreshes; yesterday's entry visible
  → Heatmap updates retroactively
```

### Flow 5 — Password Reset

```
Login page → "Forgot password?"
  → Enter email
  → Answer security question
  → Enter new password + confirm
  → POST /auth/password-reset
  → "Password updated" → redirect to Login
  → Login with new password
```

---

## 13. Edge Cases & Error States

| Scenario | Expected Behaviour |
|---|---|
| Timer running; user closes tab | Timer state persisted; on re-open timer restores to correct elapsed time |
| Session submitted with 0 minutes | Client-side validation blocks; API would also reject (min 1) |
| User deletes a subject that a running timer references | Timer's subjectId becomes orphaned; on save, log session to a "deleted subject" fallback or show error prompt |
| Two tabs open; one starts a timer | Second tab detects active timer on focus/refresh and shows the running timer |
| Friend request sent to non-friend who then blocks (future) | Not in scope v1; friendship model only has none/incoming/outgoing/friends states |
| Leaderboard with no friends | Shows only the current user; prompt to add friends |
| Exam date is today | Countdown shows "0 days — today is the day!" |
| Exam date is yesterday | Shows "Exam date passed" expired state |
| Refresh token rotation race (two tabs both 401 simultaneously) | In-flight promise de-duplication ensures only one `POST /auth/refresh` fires; the other waits and reuses the result |
| Google auth on emulator without Google Play Services | Dev login fallback for local development |
| Subject with very long name in session card | Text truncated with ellipsis; full name in tooltip |
| API rate limit hit (180 req/min) | HTTP 429 → client shows "Too many requests, please slow down" toast |

---

## 14. Security & Privacy

### 14.1 Data Classification

| Data type | Sensitivity | Notes |
|---|---|---|
| Email | PII | Never exposed in public profile APIs |
| Full name | PII (semi-public) | Shown in leaderboard and public profile when profilePublic = true |
| Username | Public identifier | Always shown (used in friend discovery and profile URL) |
| Session data (subjects, topics, durations) | Private by default | Only shown to friends when `showStats = true` |
| Mood ratings | Private | Not shown on public profiles |
| Security question answer | Sensitive | Stored as bcrypt hash; never returned in any API response |
| JWT access token | Secret | Short-lived (15 min); invalidated by server clock (exp claim) |
| Refresh token | Secret | Stored as SHA-256 hash server-side; rotated on every use |

### 14.2 Privacy Defaults

- `profilePublic = true` by default (opt-in social discovery).
- `showStats = true` by default (friends can see your stats).
- `showLeaderboard = true` by default (included in friend ranking).
- Users can change any of these at any time; changes take effect immediately on next API call.

### 14.3 Data Deletion

- Deleting a subject cascades to delete all its sessions (documented in UI warning).
- Account deletion is not supported in v1 UI (manual process via admin).
- Logout revokes the refresh token but does not delete user data.

### 14.4 CORS

Allowed origins (production):
- `https://karma-yogi-web.onrender.com`
- `http://localhost` (Capacitor Android)
- `capacitor://localhost` (Capacitor Android)

Dev-only additions: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:8081`.

Never `*`. CORS is enforced in the Go middleware via an explicit allowlist.

---

## 15. Known Gaps & Constraints

| Gap | Impact | Mitigation / Plan |
|---|---|---|
| No push notifications | Users don't get streak reminders or friend activity alerts | High priority for next cycle; Capacitor Push Notifications plugin already available |
| No offline mode | Sessions can't be logged without connectivity | Acceptable for v1; queue + sync for later |
| Email verification not implemented | Accounts can be created with fake emails | Password reset is the only email-requiring flow and uses security answer instead; add email verification in security hardening sprint |
| Account deletion not in UI | Users can't self-serve delete | Add to Profile settings in next cycle |
| iOS not published | Misses Apple ecosystem users | Capacitor supports iOS; bundle + submit when ready |
| Leaderboard uses UTC week (not user's local week) | Week boundary mismatch for IST users (Mon UTC ≠ Mon IST by 5.5 hours) | Timezone-aware leaderboard as a follow-up |
| No real-time sync between tabs/devices | Friend session liveness is approximate (based on shared startedAtMs, polled, not pushed) | WebSocket or SSE for live friend presence in future |
| Strategy Dashboard is per-account gated | No self-serve unlock | Automate unlock via a "study level" threshold (e.g. 50 sessions logged) |
| Subject name not editable | Only color is patchable | Add name edit to PATCH /subjects/{id} in next cycle |
| No session export | Users can't take their data elsewhere | CSV/JSON export endpoint as a roadmap item |

---

## 16. Future Roadmap

### 16.1 Near-Term (Next 2–3 months)

- **Push notifications:** streak reminders ("Don't break your 12-day streak!"), friend activity ("Rohan just logged 3 hours"), weekly leaderboard wrap-up ("You finished 2nd this week!")
- **Email verification:** send verification link on registration; block password-reset for unverified accounts
- **Account deletion:** self-serve from Profile settings
- **Subject name editing:** `PATCH /subjects/{id}` to accept `name` field
- **iOS distribution:** App Store submission using existing Capacitor project

### 16.2 Medium-Term (3–6 months)

- **Offline-first sessions:** queue sessions in IndexedDB, sync on reconnect (service worker)
- **AI study plan (Strategy Dashboard v2):** GPT/Claude-powered personalised daily schedule based on exam date, target hours, and subject breakdown gaps
- **Session notes / attachments:** long-form notes field on sessions, optional photo (book page, whiteboard) via Capacitor Camera
- **Study groups:** up to 10 members, shared leaderboard, group study rooms
- **Timezone-aware leaderboard:** respect each user's local week boundary

### 16.3 Long-Term (6–12 months)

- **Institutional tier:** school/coaching centre admin console, bulk user import, class-level leaderboard, teacher analytics dashboard
- **Adaptive goal setting:** ML-based weekly hour recommendations based on exam proximity and historical completion rates
- **Data export:** CSV + JSON session export, shareable Insights cards (Instagram story format)
- **Web notifications API:** browser-native push for web users without the Android app
- **Apple Watch / wearable:** lightweight session start/stop from wrist

---

## 17. Appendix — Glossary

| Term | Definition |
|---|---|
| **Session** | A single logged block of study time associated with one subject and optional topic |
| **Subject** | A study area created by the user (e.g. "Mathematics", "History") with a color label |
| **Topic** | A free-text description of what was studied within a session (e.g. "Chapter 12 — Rivers of India") |
| **Streak** | Consecutive calendar days (UTC) with at least one logged session |
| **Weekly goal** | A user-set target of hours to study in a Monday–Sunday week |
| **Exam goal** | A named upcoming exam + its date, used to display a countdown on Dashboard |
| **Mood** | A 1–5 emoji rating captured at session end representing how the session felt |
| **Pomodoro** | A time-management technique: N-minute work blocks followed by break intervals |
| **Leaderboard** | A weekly ranking of the user and their confirmed friends by total minutes studied |
| **Friend session** | A session logged simultaneously for multiple users (caller + invited friends) |
| **Public profile** | The portion of a user's data that friends (or all users, if profilePublic = true) can view |
| **canViewDetails** | API flag: true for the profile owner or a confirmed friend; gates access to stats, sessions, and insights |
| **Timer state** | A server-persisted JSON blob representing the current state of an active or paused timer |
| **Strategy Dashboard** | A gated feature providing personalised study strategy recommendations |
| **Access token** | A short-lived JWT (15 min) sent with every authenticated API request |
| **Refresh token** | A long-lived opaque token (30 days) used to rotate access tokens without re-login |
| **WAS** | Weekly Active Studiers — the North Star metric (users logging ≥ 3 sessions in a week) |
| **FOUC** | Flash of Unstyled Content — prevented by applying theme class before first render |
| **IST** | Indian Standard Time (UTC+5:30) — the timezone of the primary user base |
