package service

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"strings"
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
func (s *SessionService) Update(ctx context.Context, userID, id, subjectID, topic, mood string, duration int, startedAt time.Time) (domain.Session, error) {
	return s.repo.Update(ctx, domain.Session{ID: id, UserID: userID, SubjectID: subjectID, Topic: topic, DurationMin: duration, Mood: mood, StartedAt: startedAt})
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
func (s *SubjectService) UpdateColor(ctx context.Context, userID, id, color string) (domain.Subject, error) {
	return s.repo.UpdateColor(ctx, id, userID, color)
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

type TimerStateService struct{ repo database.TimerStateRepository }

func NewTimerStateService(repo database.TimerStateRepository) *TimerStateService {
	return &TimerStateService{repo: repo}
}

func (s *TimerStateService) Get(ctx context.Context, userID string) (map[string]any, error) {
	raw, err := s.repo.Get(ctx, userID)
	if err != nil || len(raw) == 0 {
		return nil, err
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *TimerStateService) Upsert(ctx context.Context, userID string, state map[string]any) error {
	raw, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return s.repo.Upsert(ctx, userID, raw)
}

func (s *TimerStateService) Delete(ctx context.Context, userID string) error {
	return s.repo.Delete(ctx, userID)
}

type FriendService struct {
	friends  database.FriendRepository
	subjects database.SubjectRepository
	sessions database.SessionRepository
}

type FriendSessionPlanEntry struct {
	FriendID    string
	SubjectName string
	Topic       string
}

func NewFriendService(f database.FriendRepository, sub database.SubjectRepository, sess database.SessionRepository) *FriendService {
	return &FriendService{friends: f, subjects: sub, sessions: sess}
}

func (s *FriendService) Users(ctx context.Context, userID string) ([]domain.FriendUser, error) {
	return s.friends.ListUsersWithStatus(ctx, userID)
}

func (s *FriendService) ListFriends(ctx context.Context, userID string) ([]domain.User, error) {
	return s.friends.ListFriends(ctx, userID)
}

func (s *FriendService) IncomingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error) {
	return s.friends.ListIncomingRequests(ctx, userID)
}

func (s *FriendService) OutgoingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error) {
	return s.friends.ListOutgoingRequests(ctx, userID)
}

func (s *FriendService) SendRequest(ctx context.Context, senderID, receiverID string) (domain.FriendRequest, error) {
	if senderID == receiverID {
		return domain.FriendRequest{}, errors.New("cannot send friend request to yourself")
	}
	return s.friends.SendRequest(ctx, domain.FriendRequest{
		ID:         uuid.NewString(),
		SenderID:   senderID,
		ReceiverID: receiverID,
		Status:     "pending",
	})
}

func (s *FriendService) AcceptRequest(ctx context.Context, requestID, userID string) error {
	return s.friends.AcceptRequest(ctx, requestID, userID)
}

func (s *FriendService) RejectRequest(ctx context.Context, requestID, userID string) error {
	return s.friends.RejectRequest(ctx, requestID, userID)
}

func (s *FriendService) WeeklyLeaderboard(ctx context.Context, userID string, weekOffset int) ([]domain.FriendLeaderboardEntry, error) {
	now := time.Now()
	weekStart := now.AddDate(0, 0, -int((int(now.Weekday())+6)%7)+(weekOffset*7))
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, weekStart.Location())
	weekEnd := weekStart.AddDate(0, 0, 7)
	return s.friends.ListWeeklyLeaderboard(ctx, userID, weekStart, weekEnd)
}

func (s *FriendService) CreateFriendSession(
	ctx context.Context,
	userID string,
	friendIDs []string,
	subjectName, topic string,
	perFriendPlans []FriendSessionPlanEntry,
	mood string,
	duration int,
	startedAt time.Time,
) ([]domain.Session, error) {
	if duration <= 0 {
		return nil, errors.New("duration must be positive")
	}
	defaultSubject := strings.TrimSpace(subjectName)
	defaultTopic := strings.TrimSpace(topic)
	if defaultSubject == "" {
		return nil, errors.New("subject name is required")
	}
	if defaultTopic == "" {
		return nil, errors.New("topic is required")
	}
	planByFriend := make(map[string]FriendSessionPlanEntry, len(perFriendPlans))
	for _, item := range perFriendPlans {
		friendID := strings.TrimSpace(item.FriendID)
		if friendID == "" || friendID == userID {
			continue
		}
		trimmedSubject := strings.TrimSpace(item.SubjectName)
		trimmedTopic := strings.TrimSpace(item.Topic)
		if trimmedSubject == "" {
			return nil, errors.New("friend subject name is required")
		}
		if trimmedTopic == "" {
			return nil, errors.New("friend topic is required")
		}
		planByFriend[friendID] = FriendSessionPlanEntry{
			FriendID:    friendID,
			SubjectName: trimmedSubject,
			Topic:       trimmedTopic,
		}
	}

	friendSet := map[string]bool{}
	for _, id := range friendIDs {
		id = strings.TrimSpace(id)
		if id == "" || id == userID {
			continue
		}
		friendSet[id] = true
	}
	confirmed, err := s.friends.ListFriends(ctx, userID)
	if err != nil {
		return nil, err
	}
	userIDs := []string{userID}
	for _, f := range confirmed {
		if friendSet[f.ID] {
			userIDs = append(userIDs, f.ID)
		}
	}
	if len(userIDs) == 1 {
		return nil, errors.New("choose at least one confirmed friend")
	}
	out := make([]domain.Session, 0, len(userIDs))
	for _, uid := range userIDs {
		sessionSubject := defaultSubject
		sessionTopic := defaultTopic
		if uid != userID {
			if plan, ok := planByFriend[uid]; ok {
				sessionSubject = plan.SubjectName
				sessionTopic = plan.Topic
			}
		}
		sub, err := s.subjects.GetByUserAndName(ctx, uid, sessionSubject)
		if err != nil {
			if errors.Is(err, database.ErrUserNotFound) {
				prevIcon, iconErr := s.subjects.GetLatestIcon(ctx, uid)
				if iconErr != nil {
					return nil, iconErr
				}
				sub, err = s.subjects.Create(ctx, domain.Subject{
					ID:     uuid.NewString(),
					UserID: uid,
					Name:   sessionSubject,
					Color:  "green",
					Icon:   pickStudyIcon(prevIcon),
				})
				if err != nil {
					return nil, err
				}
			} else {
				return nil, err
			}
		}
		sess, err := s.sessions.Create(ctx, domain.Session{
			ID:          uuid.NewString(),
			UserID:      uid,
			SubjectID:   sub.ID,
			Topic:       sessionTopic,
			DurationMin: duration,
			Mood:        mood,
			StartedAt:   startedAt,
		})
		if err != nil {
			return nil, err
		}
		out = append(out, sess)
	}
	return out, nil
}
