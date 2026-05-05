package domain

import "time"

type User struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	FullName         string    `json:"fullName"`
	Username         string    `json:"username"`
	Phone            string    `json:"phone"`
	AvatarURL        string    `json:"avatarUrl"`
	GoogleSub        string    `json:"-"`
	PasswordHash     string    `json:"-"`
	SecretAnswerHash string    `json:"-"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Session struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	SubjectID   string    `json:"subjectId"`
	Topic       string    `json:"topic"`
	DurationMin int       `json:"durationMin"`
	Mood        string    `json:"mood"`
	StartedAt   time.Time `json:"startedAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Subject struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Icon      string    `json:"icon"`
	CreatedAt time.Time `json:"createdAt"`
}

type Goal struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Title         string    `json:"title"`
	TargetMinutes int       `json:"targetMinutes"`
	Deadline      time.Time `json:"deadline"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type ExamGoal struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Name      string    `json:"name"`
	ExamDate  time.Time `json:"examDate"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

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
	ShowStrategyPage       bool      `json:"showStrategyPage"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type UserPrivacySettings struct {
	UserID          string    `json:"userId"`
	ProfilePublic   bool      `json:"profilePublic"`
	ShowStats       bool      `json:"showStats"`
	ShowLeaderboard bool      `json:"showLeaderboard"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type PublicProfileStats struct {
	TotalMinutes      int `json:"totalMinutes"`
	TotalSessions     int `json:"totalSessions"`
	ActiveDays        int `json:"activeDays"`
	AvgSessionMinutes int `json:"avgSessionMinutes"`
	LongestSession    int `json:"longestSession"`
	ThisWeekMinutes   int `json:"thisWeekMinutes"`
	FriendCount       int `json:"friendCount"`
}

type PublicProfileView struct {
	User    User                `json:"user"`
	Profile UserPublicProfile   `json:"profile"`
	Privacy UserPrivacySettings `json:"privacy"`
	Stats   *PublicProfileStats `json:"stats,omitempty"`
}

type PublicProfileOverview struct {
	TotalMinutes      int `json:"totalMinutes"`
	TotalSessions     int `json:"totalSessions"`
	ActiveDays        int `json:"activeDays"`
	AvgSessionMinutes int `json:"avgSessionMinutes"`
	LongestSession    int `json:"longestSession"`
	ThisWeekMinutes   int `json:"thisWeekMinutes"`
	FriendCount       int `json:"friendCount"`
	CurrentStreakDays int `json:"currentStreakDays"`
	MaxStreakDays     int `json:"maxStreakDays"`
}

type PublicProfileSession struct {
	ID          string    `json:"id"`
	SubjectID   string    `json:"subjectId"`
	SubjectName string    `json:"subjectName"`
	Topic       string    `json:"topic"`
	DurationMin int       `json:"durationMin"`
	Mood        string    `json:"mood"`
	StartedAt   time.Time `json:"startedAt"`
}

type PublicProfileInsightsDaily struct {
	DateKey string `json:"dateKey"`
	Minutes int    `json:"minutes"`
}

type PublicProfileInsightsSubject struct {
	SubjectID   string `json:"subjectId"`
	SubjectName string `json:"subjectName"`
	Minutes     int    `json:"minutes"`
}

type PublicProfileInsights struct {
	DailyMinutes       []PublicProfileInsightsDaily   `json:"dailyMinutes"`
	WeeklyMinutes      []PublicProfileInsightsDaily   `json:"weeklyMinutes"`
	SubjectBreakdown   []PublicProfileInsightsSubject `json:"subjectBreakdown"`
	PeakHourLocal      int                            `json:"peakHourLocal"`
	PeakHourMinutes    int                            `json:"peakHourMinutes"`
	BestDayDateKey     string                         `json:"bestDayDateKey"`
	BestDayMinutes     int                            `json:"bestDayMinutes"`
	MostStudiedSubject string                         `json:"mostStudiedSubject"`
}

type PublicProfileDetails struct {
	User           User                   `json:"user"`
	Profile        UserPublicProfile      `json:"profile"`
	Privacy        UserPrivacySettings    `json:"privacy"`
	CanViewDetails bool                   `json:"canViewDetails"`
	Overview       *PublicProfileOverview `json:"overview,omitempty"`
	Sessions       []PublicProfileSession `json:"sessions,omitempty"`
	Insights       *PublicProfileInsights `json:"insights,omitempty"`
	Heatmap        map[string]int         `json:"heatmap,omitempty"`
}

type Insights struct {
	TotalMinutes   int `json:"totalMinutes"`
	SessionCount   int `json:"sessionCount"`
	WeeklyMinutes  int `json:"weeklyMinutes"`
	GoalCompletion int `json:"goalCompletion"`
}

// StudyStatsSummary is aggregated from stored sessions (all-time + current calendar week in timezoneUsed).
type StudyStatsSummary struct {
	TotalMinutes          int     `json:"totalMinutes"`
	TotalSessions         int     `json:"totalSessions"`
	AvgSessionMinutes     int     `json:"avgSessionMinutes"`
	LongestSessionMinutes int     `json:"longestSessionMinutes"`
	AvgMood               float64 `json:"avgMood"`
	ActiveDistinctDays    int     `json:"activeDistinctDays"`
	WeekMinutesCurrent    int     `json:"weekMinutesCurrent"`
	TimezoneUsed          string  `json:"timezoneUsed"`
}

// UserAchievement is derived from sessions and friends (no separate persistence).
// Day-based rules use the UTC calendar date of session started_at; streak "today" uses UTC.
type UserAchievement struct {
	Key      string     `json:"key"`
	Earned   bool       `json:"earned"`
	EarnedAt *time.Time `json:"earnedAt,omitempty"`
}

type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	RevokedAt *time.Time
}

type FriendRequest struct {
	ID          string     `json:"id"`
	SenderID    string     `json:"senderId"`
	ReceiverID  string     `json:"receiverId"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
	RespondedAt *time.Time `json:"respondedAt,omitempty"`
}

type FriendUser struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	FullName         string `json:"fullName"`
	Username         string `json:"username"`
	FriendshipStatus string `json:"friendshipStatus"`
}

type FriendLeaderboardEntry struct {
	UserID        string `json:"userId"`
	FullName      string `json:"fullName"`
	Username      string `json:"username"`
	WeeklyMinutes int    `json:"weeklyMinutes"`
}
