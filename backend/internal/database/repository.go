package database

import (
	"context"
	"errors"
	"time"

	"github.com/karma-yogi/backend/internal/domain"
)

var ErrUserNotFound = errors.New("user not found")

type UserRepository interface {
	UpsertGoogleUser(ctx context.Context, email, fullName, avatarURL, googleSub string) (domain.User, error)
	CreateWithPassword(ctx context.Context, email, fullName, passwordHash, secretAnswerHash string) (domain.User, error)
	GetByEmail(ctx context.Context, email string) (domain.User, error)
	GetByID(ctx context.Context, id string) (domain.User, error)
	ListOthers(ctx context.Context, userID string) ([]domain.User, error)
	UpdateProfile(ctx context.Context, id, fullName, username, phone, avatarURL string) (domain.User, error)
	UpdatePasswordHash(ctx context.Context, userID, passwordHash string) error
}

type SessionRepository interface {
	Create(ctx context.Context, session domain.Session) (domain.Session, error)
	ListByUser(ctx context.Context, userID string, from, to *time.Time) ([]domain.Session, error)
	Update(ctx context.Context, session domain.Session) (domain.Session, error)
	Delete(ctx context.Context, id, userID string) error
}

type SubjectRepository interface {
	Create(ctx context.Context, subject domain.Subject) (domain.Subject, error)
	ListByUser(ctx context.Context, userID string) ([]domain.Subject, error)
	GetByUserAndName(ctx context.Context, userID, name string) (domain.Subject, error)
	GetLatestIcon(ctx context.Context, userID string) (string, error)
	Delete(ctx context.Context, id, userID string) error
}

type GoalRepository interface {
	Create(ctx context.Context, goal domain.Goal) (domain.Goal, error)
	ListByUser(ctx context.Context, userID string) ([]domain.Goal, error)
	Update(ctx context.Context, goal domain.Goal) (domain.Goal, error)
	Delete(ctx context.Context, id, userID string) error
}

type TimerStateRepository interface {
	Get(ctx context.Context, userID string) ([]byte, error)
	Upsert(ctx context.Context, userID string, state []byte) error
	Delete(ctx context.Context, userID string) error
}

type FriendRepository interface {
	SendRequest(ctx context.Context, req domain.FriendRequest) (domain.FriendRequest, error)
	ListIncomingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error)
	ListOutgoingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error)
	AcceptRequest(ctx context.Context, requestID, userID string) error
	RejectRequest(ctx context.Context, requestID, userID string) error
	ListFriends(ctx context.Context, userID string) ([]domain.User, error)
	ListUsersWithStatus(ctx context.Context, userID string) ([]domain.FriendUser, error)
	ListWeeklyLeaderboard(ctx context.Context, userID string, from, to time.Time) ([]domain.FriendLeaderboardEntry, error)
}

type AuthRepository interface {
	SaveRefreshToken(ctx context.Context, token domain.RefreshToken) error
	GetRefreshToken(ctx context.Context, id string) (domain.RefreshToken, error)
	RevokeRefreshToken(ctx context.Context, id string) error
}
