# Karma Yogi Backend Architecture

## Domain Models

**File:** `/Users/admin/Code/karma-yogi/backend/internal/domain/models.go`

### User
```go
type User struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	FullName         string    `json:"fullName"`
	Username         string    `json:"username"`
	Phone            string    `json:"phone"`
	AvatarURL        string    `json:"avatarUrl"`
	GoogleSub        string    `json:"-"` // Hidden from JSON
	PasswordHash     string    `json:"-"`
	SecretAnswerHash string    `json:"-"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}
```

### Session
```go
type Session struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	SubjectID   string    `json:"subjectId"`
	Topic       string    `json:"topic"`
	DurationMin int       `json:"durationMin"`
	Mood        string    `json:"mood"` // Stored as string "1"-"5"
	StartedAt   time.Time `json:"startedAt"`
	CreatedAt   time.Time `json:"createdAt"`
}
```

### Subject
```go
type Subject struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Color     string    `json:"color"` // cyan|green|orange|pink|purple
	Icon      string    `json:"icon"`  // Emoji or icon string
	CreatedAt time.Time `json:"createdAt"`
}
```

### Goal
```go
type Goal struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Title         string    `json:"title"`
	TargetMinutes int       `json:"targetMinutes"`
	Deadline      time.Time `json:"deadline"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
```

### ExamGoal
```go
type ExamGoal struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	ExamDate  time.Time `json:"examDate"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
```

### UserPublicProfile
```go
type UserPublicProfile struct {
	UserID        string    `json:"userId"`
	Bio           string    `json:"bio"`
	Location      string    `json:"location"`
	Education     string    `json:"education"`
	Occupation    string    `json:"occupation"`
	TargetExam    string    `json:"targetExam"`
	TargetCollege string    `json:"targetCollege"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
```

### UserPreferences
```go
type UserPreferences struct {
	UserID                 string    `json:"userId"`
	PreferredStudyTime     string    `json:"preferredStudyTime"`
	DefaultSessionMinutes  int       `json:"defaultSessionMinutes"`
	BreakMinutes           int       `json:"breakMinutes"`
	PomodoroCycles         int       `json:"pomodoroCycles"`
	StudyLevel             string    `json:"studyLevel"`
	WeeklyGoalHours        int       `json:"weeklyGoalHours"`
	EmailNotifications     bool      `json:"emailNotifications"`
	PushNotifications      bool      `json:"pushNotifications"`
	ReminderNotifications  bool      `json:"reminderNotifications"`
	MarketingNotifications bool      `json:"marketingNotifications"`
	ShowStrategyPage       bool      `json:"showStrategyPage"` // Enables strategy dashboard
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}
```

### UserPrivacySettings
```go
type UserPrivacySettings struct {
	UserID          string    `json:"userId"`
	ProfilePublic   bool      `json:"profilePublic"`
	ShowStats       bool      `json:"showStats"`
	ShowLeaderboard bool      `json:"showLeaderboard"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}
```

### Achievement & Stats
```go
type UserAchievement struct {
	Key      string     `json:"key"`
	Earned   bool       `json:"earned"`
	EarnedAt *time.Time `json:"earnedAt,omitempty"`
}

type StudyStatsSummary struct {
	TotalMinutes          int     `json:"totalMinutes"`
	TotalSessions         int     `json:"totalSessions"`
	AvgSessionMinutes     int     `json:"avgSessionMinutes"`
	LongestSessionMinutes int     `json:"longestSessionMinutes"`
	AvgMood               float64 `json:"avgMood"`
	ActiveDistinctDays    int     `json:"activeDistinctDays"`
	WeekMinutesCurrent    int     `json:"weekMinutesCurrent"` // Current calendar week in timezoneUsed
	TimezoneUsed          string  `json:"timezoneUsed"`
}
```

### Friends
```go
type FriendRequest struct {
	ID          string     `json:"id"`
	SenderID    string     `json:"senderId"`
	ReceiverID  string     `json:"receiverId"`
	Status      string     `json:"status"` // pending|accepted|rejected
	CreatedAt   time.Time  `json:"createdAt"`
	RespondedAt *time.Time `json:"respondedAt,omitempty"`
}

type FriendUser struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	FullName         string `json:"fullName"`
	Username         string `json:"username"`
	FriendshipStatus string `json:"friendshipStatus"` // none|incoming|outgoing|friends
}

type FriendLeaderboardEntry struct {
	UserID        string `json:"userId"`
	FullName      string `json:"fullName"`
	Username      string `json:"username"`
	WeeklyMinutes int    `json:"weeklyMinutes"`
}
```

---

## HTTP Router

**File:** `/Users/admin/Code/karma-yogi/backend/internal/http/router.go`

### Middleware Stack
```go
r.Use(chimiddleware.RequestID)        // Adds request ID
r.Use(chimiddleware.RealIP)           // Extracts real IP
r.Use(chimiddleware.Recoverer)        // Panic recovery
r.Use(middleware.SecurityHeaders)     // Security headers
r.Use(middleware.ClientMetaMiddleware) // Client platform/version
r.Use(middleware.RequestLog)          // Request logging
r.Use(middleware.RateLimitPerIP(180, time.Minute)) // Rate limiting
r.Use(simpleCORS(corsAllowed))        // CORS handling
```

### CORS Implementation
```go
func simpleCORS(allowed []string) func(http.Handler) http.Handler {
	allowedMap := map[string]bool{}
	for _, a := range allowed {
		allowedMap[strings.TrimSpace(a)] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowedMap[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Client-Platform, X-App-Version, Cookie")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
```

### Route Groups

**Public Routes (no auth):**
- `POST /auth/google` - GoogleLogin
- `POST /auth/register` - RegisterWithPassword
- `POST /auth/login` - LoginWithPassword
- `POST /auth/password-reset` - ResetPasswordWithSecret
- `POST /auth/dev-login` - DevLogin (dev only)
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/logout` - Logout

**Protected Routes (require Bearer token in middleware.Auth):**
```go
api.Group(func(p chi.Router) {
	p.Use(middleware.Auth(tm))
	
	// User routes
	p.Get("/users/me", h.Users.Me)
	p.Patch("/users/me", h.Users.Update)
	
	// Profile routes
	p.Get("/users/me/public-profile", h.Profile.GetMyPublicProfile)
	p.Patch("/users/me/public-profile", h.Profile.PatchMyPublicProfile)
	p.Get("/users/me/preferences", h.Profile.GetMyPreferences)
	p.Patch("/users/me/preferences", h.Profile.PatchMyPreferences)
	p.Get("/users/me/privacy", h.Profile.GetMyPrivacy)
	p.Patch("/users/me/privacy", h.Profile.PatchMyPrivacy)
	
	// Public profile access (other users)
	p.Get("/users/{username}/public-profile", h.Profile.GetPublicProfile)
	p.Post("/friends/friend-profile", h.Profile.GetPublicProfileDetails)
	
	// Achievements & Stats
	p.Get("/users/me/achievements", h.Achievements.ListMine)
	p.Get("/users/me/study-stats", h.StudyStats.GetMine)
	
	// CRUD routes
	p.Post("/subjects", h.Subjects.Create)
	p.Get("/subjects", h.Subjects.List)
	p.Patch("/subjects/{id}", h.Subjects.UpdateColor)
	p.Delete("/subjects/{id}", h.Subjects.Delete)
	
	p.Post("/sessions", h.Sessions.Create)
	p.Get("/sessions", h.Sessions.List)
	p.Patch("/sessions/{id}", h.Sessions.Update)
	p.Delete("/sessions/{id}", h.Sessions.Delete)
	
	p.Post("/goals", h.Goals.Create)
	p.Get("/goals", h.Goals.List)
	p.Patch("/goals/{id}", h.Goals.Update)
	p.Delete("/goals/{id}", h.Goals.Delete)
	
	p.Get("/exam-goal", h.ExamGoals.Get)
	p.Put("/exam-goal", h.ExamGoals.Upsert)
	p.Delete("/exam-goal", h.ExamGoals.Delete)
	
	p.Get("/insights", h.Insights.Get)
	
	p.Get("/timer-state", h.Timer.Get)
	p.Post("/timer-state/start", h.Timer.Start)
	p.Put("/timer-state", h.Timer.Upsert)
	p.Delete("/timer-state", h.Timer.Delete)
	
	// Friend routes
	p.Get("/friends/users", h.Friends.Users)
	p.Get("/friends", h.Friends.ListFriends)
	p.Get("/friends/requests/incoming", h.Friends.IncomingRequests)
	p.Get("/friends/requests/outgoing", h.Friends.OutgoingRequests)
	p.Post("/friends/requests", h.Friends.SendRequest)
	p.Post("/friends/requests/{id}/accept", h.Friends.AcceptRequest)
	p.Post("/friends/requests/{id}/reject", h.Friends.RejectRequest)
	p.Get("/friends/leaderboard", h.Friends.WeeklyLeaderboard)
	p.Post("/friends/sessions", h.Friends.CreateFriendSession)
})
```

---

## HTTP Response Helper

**File:** `/Users/admin/Code/karma-yogi/backend/internal/http/response.go`

```go
func JSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
```

---

## Authentication Middleware

**File:** `/Users/admin/Code/karma-yogi/backend/internal/middleware/auth.go`

```go
type userCtxKey string
const UserContextKey userCtxKey = "user"

func Auth(tm *auth.TokenManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}
			claims, err := tm.ParseAccessToken(strings.TrimPrefix(h, "Bearer "))
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
```

---

## Handler Pattern

**File:** `/Users/admin/Code/karma-yogi/backend/internal/controller/controllers.go` (snippet)

```go
type Handlers struct {
	Auth         *AuthHandler
	Users        *UserHandler
	Profile      *ProfileHandler
	Subjects     *SubjectHandler
	Sessions     *SessionHandler
	Goals        *GoalHandler
	ExamGoals    *ExamGoalHandler
	Insights     *InsightsHandler
	Timer        *TimerStateHandler
	Friends      *FriendHandler
	Achievements *AchievementHandler
	StudyStats   *StudyStatsHandler
}

func NewHandlers(a *service.AuthService, u *service.UserService, ...) Handlers {
	return Handlers{
		Auth:         &AuthHandler{svc: a},
		Users:        &UserHandler{svc: u},
		// ...
	}
}

// Handler example
type AuthHandler struct{ svc *service.AuthService }

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.svc.GoogleLogin(r.Context(), req.Token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, res)
}
```

---

## Service Layer Pattern

**File:** `/Users/admin/Code/karma-yogi/backend/internal/service/domain_services.go` (snippet)

```go
type UserService struct{ repo database.UserRepository }

func NewUserService(repo database.UserRepository) *UserService { 
	return &UserService{repo: repo} 
}

func (s *UserService) Me(ctx context.Context, userID string) (domain.User, error) {
	return s.repo.GetByID(ctx, userID)
}

func (s *UserService) Update(ctx context.Context, userID, name, username, phone, avatar string) (domain.User, error) {
	return s.repo.UpdateProfile(ctx, userID, name, username, phone, avatar)
}

type SessionService struct{ repo database.SessionRepository }

func NewSessionService(repo database.SessionRepository) *SessionService {
	return &SessionService{repo: repo}
}

func (s *SessionService) Create(ctx context.Context, userID, subjectID, topic, mood string, duration int, startedAt time.Time) (domain.Session, error) {
	return s.repo.Create(ctx, domain.Session{
		ID: uuid.NewString(), UserID: userID, SubjectID: subjectID, Topic: topic, 
		DurationMin: duration, Mood: mood, StartedAt: startedAt,
	})
}

func (s *SessionService) List(ctx context.Context, userID string, from, to *time.Time) ([]domain.Session, error) {
	return s.repo.ListByUser(ctx, userID, from, to)
}

func (s *SessionService) Update(ctx context.Context, userID, id, subjectId, topic, mood string, duration int, startedAt time.Time) (domain.Session, error) {
	return s.repo.Update(ctx, domain.Session{
		ID: id, UserID: userID, SubjectID: subjectId, Topic: topic, 
		DurationMin: duration, Mood: mood, StartedAt: startedAt,
	})
}

func (s *SessionService) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, id, userID)
}
```

**Patterns:**
- Single method per entity + repository pair
- Thin service layer (mostly delegates to repo)
- Error handling bubbled up (no specific error wrapping in services)
- Context passed through for cancellation
- UUID generation in service (not repo)
