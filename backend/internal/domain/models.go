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

type Insights struct {
	TotalMinutes   int `json:"totalMinutes"`
	SessionCount   int `json:"sessionCount"`
	WeeklyMinutes  int `json:"weeklyMinutes"`
	GoalCompletion int `json:"goalCompletion"`
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
