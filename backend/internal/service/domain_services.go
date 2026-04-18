package service

import (
	"context"
	"crypto/rand"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
)

type UserService struct{ repo database.UserRepository }

func NewUserService(repo database.UserRepository) *UserService { return &UserService{repo: repo} }
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
	return s.repo.Create(ctx, domain.Session{ID: uuid.NewString(), UserID: userID, SubjectID: subjectID, Topic: topic, DurationMin: duration, Mood: mood, StartedAt: startedAt})
}
func (s *SessionService) List(ctx context.Context, userID string, from, to *time.Time) ([]domain.Session, error) {
	return s.repo.ListByUser(ctx, userID, from, to)
}
func (s *SessionService) Update(ctx context.Context, userID, id, topic, mood string, duration int, startedAt time.Time) (domain.Session, error) {
	return s.repo.Update(ctx, domain.Session{ID: id, UserID: userID, Topic: topic, DurationMin: duration, Mood: mood, StartedAt: startedAt})
}
func (s *SessionService) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, id, userID)
}

type GoalService struct{ repo database.GoalRepository }

func NewGoalService(repo database.GoalRepository) *GoalService { return &GoalService{repo: repo} }
func (s *GoalService) Create(ctx context.Context, userID, title string, target int, deadline time.Time) (domain.Goal, error) {
	return s.repo.Create(ctx, domain.Goal{ID: uuid.NewString(), UserID: userID, Title: title, TargetMinutes: target, Deadline: deadline})
}
func (s *GoalService) List(ctx context.Context, userID string) ([]domain.Goal, error) {
	return s.repo.ListByUser(ctx, userID)
}
func (s *GoalService) Update(ctx context.Context, g domain.Goal) (domain.Goal, error) {
	return s.repo.Update(ctx, g)
}
func (s *GoalService) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, id, userID)
}

type SubjectService struct{ repo database.SubjectRepository }

func NewSubjectService(repo database.SubjectRepository) *SubjectService {
	return &SubjectService{repo: repo}
}
func (s *SubjectService) Create(ctx context.Context, userID, name, color string) (domain.Subject, error) {
	prevIcon, err := s.repo.GetLatestIcon(ctx, userID)
	if err != nil {
		return domain.Subject{}, err
	}
	icon := pickStudyIcon(prevIcon)
	return s.repo.Create(ctx, domain.Subject{ID: uuid.NewString(), UserID: userID, Name: name, Color: color, Icon: icon})
}
func (s *SubjectService) List(ctx context.Context, userID string) ([]domain.Subject, error) {
	return s.repo.ListByUser(ctx, userID)
}
func (s *SubjectService) Delete(ctx context.Context, userID, id string) error {
	return s.repo.Delete(ctx, id, userID)
}

var studyIcons = []string{"📘", "📗", "📙", "📚", "📝", "✏️", "🧠", "🎓", "📖", "🧪"}

func pickStudyIcon(previous string) string {
	candidates := studyIcons
	if previous != "" && len(studyIcons) > 1 {
		filtered := make([]string, 0, len(studyIcons)-1)
		for _, icon := range studyIcons {
			if icon != previous {
				filtered = append(filtered, icon)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
		}
	}
	n := big.NewInt(int64(len(candidates)))
	r, err := rand.Int(rand.Reader, n)
	if err != nil {
		return candidates[0]
	}
	return candidates[r.Int64()]
}

type InsightsService struct {
	sessions database.SessionRepository
	goals    database.GoalRepository
}

func NewInsightsService(s database.SessionRepository, g database.GoalRepository) *InsightsService {
	return &InsightsService{sessions: s, goals: g}
}
func (s *InsightsService) Get(ctx context.Context, userID string) (domain.Insights, error) {
	now := time.Now()
	week := now.AddDate(0, 0, -7)
	all, err := s.sessions.ListByUser(ctx, userID, nil, nil)
	if err != nil {
		return domain.Insights{}, err
	}
	weekly, err := s.sessions.ListByUser(ctx, userID, &week, &now)
	if err != nil {
		return domain.Insights{}, err
	}
	goals, err := s.goals.ListByUser(ctx, userID)
	if err != nil {
		return domain.Insights{}, err
	}
	total := 0
	weeklyTotal := 0
	for _, x := range all {
		total += x.DurationMin
	}
	for _, x := range weekly {
		weeklyTotal += x.DurationMin
	}
	goalCompletion := 0
	if len(goals) > 0 {
		target := 0
		for _, g := range goals {
			target += g.TargetMinutes
		}
		if target > 0 {
			goalCompletion = (total * 100) / target
		}
	}
	return domain.Insights{TotalMinutes: total, SessionCount: len(all), WeeklyMinutes: weeklyTotal, GoalCompletion: goalCompletion}, nil
}
