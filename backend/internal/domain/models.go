package domain

import "time"

type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"fullName"`
	Username  string    `json:"username"`
	Phone     string    `json:"phone"`
	AvatarURL string    `json:"avatarUrl"`
	GoogleSub string    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
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
