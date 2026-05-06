package service

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strconv"
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

type ExamGoalService struct{ repo database.ExamGoalRepository }

func NewExamGoalService(repo database.ExamGoalRepository) *ExamGoalService {
	return &ExamGoalService{repo: repo}
}

func (s *ExamGoalService) Get(ctx context.Context, userID string) (domain.ExamGoal, error) {
	return s.repo.GetByUser(ctx, userID)
}

func (s *ExamGoalService) Upsert(ctx context.Context, userID, name string, examDate time.Time) (domain.ExamGoal, error) {
	normalized := strings.TrimSpace(name)
	if normalized == "" {
		return domain.ExamGoal{}, errors.New("name is required")
	}
	return s.repo.Upsert(ctx, domain.ExamGoal{
		ID:       uuid.NewString(),
		UserID:   userID,
		Name:     normalized,
		ExamDate: examDate,
	})
}

func (s *ExamGoalService) Delete(ctx context.Context, userID string) error {
	return s.repo.DeleteByUser(ctx, userID)
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

type ProfileService struct {
	users       database.UserRepository
	publicRepo  database.UserPublicProfileRepository
	prefRepo    database.UserPreferencesRepository
	privacyRepo database.UserPrivacyRepository
	friendRepo  database.FriendRepository
	sessionRepo database.SessionRepository
	subjectRepo database.SubjectRepository
}

type FriendSessionPlanEntry struct {
	FriendID    string
	SubjectName string
	Topic       string
}

func NewFriendService(f database.FriendRepository, sub database.SubjectRepository, sess database.SessionRepository) *FriendService {
	return &FriendService{friends: f, subjects: sub, sessions: sess}
}

func NewProfileService(
	users database.UserRepository,
	publicRepo database.UserPublicProfileRepository,
	prefRepo database.UserPreferencesRepository,
	privacyRepo database.UserPrivacyRepository,
	friendRepo database.FriendRepository,
	sessionRepo database.SessionRepository,
	subjectRepo database.SubjectRepository,
) *ProfileService {
	return &ProfileService{
		users: users, publicRepo: publicRepo, prefRepo: prefRepo, privacyRepo: privacyRepo, friendRepo: friendRepo, sessionRepo: sessionRepo, subjectRepo: subjectRepo,
	}
}

func (s *ProfileService) GetMyPublicProfile(ctx context.Context, userID string) (domain.UserPublicProfile, error) {
	return s.publicRepo.GetByUser(ctx, userID)
}

func (s *ProfileService) UpsertMyPublicProfile(ctx context.Context, userID string, profile domain.UserPublicProfile) (domain.UserPublicProfile, error) {
	profile.UserID = userID
	profile.Bio = strings.TrimSpace(profile.Bio)
	profile.Location = strings.TrimSpace(profile.Location)
	profile.Education = strings.TrimSpace(profile.Education)
	profile.Occupation = strings.TrimSpace(profile.Occupation)
	profile.TargetExam = strings.TrimSpace(profile.TargetExam)
	profile.TargetCollege = strings.TrimSpace(profile.TargetCollege)
	return s.publicRepo.Upsert(ctx, profile)
}

func (s *ProfileService) GetMyPreferences(ctx context.Context, userID string) (domain.UserPreferences, error) {
	prefs, err := s.prefRepo.GetByUser(ctx, userID)
	if err != nil {
		return prefs, err
	}
	if prefs.WeeklyGoalHours <= 0 {
		prefs.WeeklyGoalHours = 20
	}
	return prefs, nil
}

func (s *ProfileService) UpsertMyPreferences(ctx context.Context, userID string, prefs domain.UserPreferences) (domain.UserPreferences, error) {
	prefs.UserID = userID
	prefs.PreferredStudyTime = strings.TrimSpace(prefs.PreferredStudyTime)
	prefs.StudyLevel = strings.TrimSpace(prefs.StudyLevel)
	if prefs.DefaultSessionMinutes <= 0 {
		prefs.DefaultSessionMinutes = 50
	}
	if prefs.BreakMinutes < 0 {
		prefs.BreakMinutes = 10
	}
	if prefs.PomodoroCycles <= 0 {
		prefs.PomodoroCycles = 4
	}
	if prefs.WeeklyGoalHours <= 0 {
		prefs.WeeklyGoalHours = 20
	}
	return s.prefRepo.Upsert(ctx, prefs)
}

func (s *ProfileService) GetMyPrivacy(ctx context.Context, userID string) (domain.UserPrivacySettings, error) {
	return s.privacyRepo.GetByUser(ctx, userID)
}

func (s *ProfileService) UpsertMyPrivacy(ctx context.Context, userID string, privacy domain.UserPrivacySettings) (domain.UserPrivacySettings, error) {
	privacy.UserID = userID
	return s.privacyRepo.Upsert(ctx, privacy)
}

func (s *ProfileService) GetPublicProfile(ctx context.Context, requesterID, username string) (domain.PublicProfileView, error) {
	target, err := s.resolveTargetUser(ctx, username)
	if err != nil {
		return domain.PublicProfileView{}, err
	}
	profile, err := s.publicRepo.GetByUser(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileView{}, err
	}
	privacy, err := s.privacyRepo.GetByUser(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileView{}, err
	}
	view := domain.PublicProfileView{
		User: target, Profile: profile, Privacy: privacy,
	}
	canViewAll := s.canViewPublicProfile(ctx, requesterID, target.ID, privacy)
	if !canViewAll {
		view.Profile.Bio = ""
		view.Profile.Location = ""
		view.Profile.Education = ""
		view.Profile.Occupation = ""
		view.Profile.TargetExam = ""
		view.Profile.TargetCollege = ""
		return view, nil
	}
	if privacy.ShowStats {
		stats, serr := s.computeStats(ctx, target.ID)
		if serr == nil {
			view.Stats = &stats
		}
	}
	return view, nil
}

func (s *ProfileService) GetPublicProfileDetails(ctx context.Context, requesterID, usernameOrID string, page, limit int) (domain.PublicProfileDetails, error) {
	target, err := s.resolveTargetUser(ctx, usernameOrID)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	profile, err := s.publicRepo.GetByUser(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	privacy, err := s.privacyRepo.GetByUser(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	view := domain.PublicProfileDetails{
		User:           target,
		Profile:        profile,
		Privacy:        privacy,
		CanViewDetails: s.canViewDetailedProfile(ctx, requesterID, target.ID),
	}
	if !view.CanViewDetails {
		return view, nil
	}
	stats, err := s.computeStats(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	sessions, err := s.sessionRepo.ListByUser(ctx, target.ID, nil, nil)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	subjects, err := s.subjectRepo.ListByUser(ctx, target.ID)
	if err != nil {
		return domain.PublicProfileDetails{}, err
	}
	prefs, err := s.prefRepo.GetByUser(ctx, target.ID)
	if err != nil {
		prefs = domain.UserPreferences{WeeklyGoalHours: 20}
	}
	overview, sessionViews, insights, heatmap := buildPublicProfileDetails(stats, sessions, subjects, prefs.WeeklyGoalHours)
	total := len(sessionViews)
	if limit <= 0 {
		limit = 20
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	if offset >= total {
		offset = total
	}
	end := offset + limit
	if end > total {
		end = total
	}
	view.Overview = &overview
	view.Sessions = sessionViews[offset:end]
	view.SessionsTotal = total
	view.SessionsHasMore = end < total
	view.Insights = &insights
	view.Heatmap = heatmap
	return view, nil
}

func (s *ProfileService) canViewPublicProfile(ctx context.Context, requesterID, targetID string, privacy domain.UserPrivacySettings) bool {
	if requesterID == targetID {
		return true
	}
	if privacy.ProfilePublic {
		return true
	}
	return s.canViewDetailedProfile(ctx, requesterID, targetID)
}

func (s *ProfileService) canViewDetailedProfile(ctx context.Context, requesterID, targetID string) bool {
	if requesterID == targetID {
		return true
	}
	friends, ferr := s.friendRepo.ListFriends(ctx, targetID)
	if ferr != nil {
		return false
	}
	for _, f := range friends {
		if f.ID == requesterID {
			return true
		}
	}
	return false
}

func (s *ProfileService) resolveTargetUser(ctx context.Context, usernameOrID string) (domain.User, error) {
	trimmed := strings.TrimSpace(usernameOrID)
	if trimmed == "" {
		return domain.User{}, errors.New("user is required")
	}
	target, err := s.users.GetByUsername(ctx, trimmed)
	if err == nil {
		return target, nil
	}
	return s.users.GetByID(ctx, trimmed)
}

type sessionAggregates struct {
	dayMinutes      map[string]int
	weekMinutes     map[string]int
	subjectMinutes  map[string]int
	subjectNameByID map[string]string
	hourMinutes     map[int]int
	bestDayDate     string
	bestDayMinutes  int
	daySet          map[string]bool
	avgMood         float64
}

func aggregateSessions(sessions []domain.Session, subjectByID map[string]string) sessionAggregates {
	agg := sessionAggregates{
		dayMinutes:      map[string]int{},
		weekMinutes:     map[string]int{},
		subjectMinutes:  map[string]int{},
		subjectNameByID: map[string]string{},
		hourMinutes:     map[int]int{},
		daySet:          map[string]bool{},
	}
	var moodSum float64
	var moodCount int
	for _, sess := range sessions {
		dateKey := sess.StartedAt.Format("2006-01-02")
		agg.daySet[dateKey] = true
		agg.dayMinutes[dateKey] += sess.DurationMin
		if agg.dayMinutes[dateKey] > agg.bestDayMinutes {
			agg.bestDayMinutes = agg.dayMinutes[dateKey]
			agg.bestDayDate = dateKey
		}
		year, week := sess.StartedAt.ISOWeek()
		agg.weekMinutes[fmt.Sprintf("%04d-W%02d", year, week)] += sess.DurationMin
		agg.hourMinutes[sess.StartedAt.Hour()] += sess.DurationMin
		agg.subjectMinutes[sess.SubjectID] += sess.DurationMin
		if agg.subjectNameByID[sess.SubjectID] == "" {
			if name := subjectByID[sess.SubjectID]; name != "" {
				agg.subjectNameByID[sess.SubjectID] = name
			} else {
				agg.subjectNameByID[sess.SubjectID] = "Unknown"
			}
		}
		if mood, err := strconv.ParseFloat(sess.Mood, 64); err == nil && mood > 0 {
			moodSum += mood
			moodCount++
		}
	}
	if moodCount > 0 {
		agg.avgMood = moodSum / float64(moodCount)
	}
	return agg
}

func computeOverview(stats domain.PublicProfileStats, agg sessionAggregates, sessions []domain.Session, weeklyGoalHours int) domain.PublicProfileOverview {
	if weeklyGoalHours <= 0 {
		weeklyGoalHours = 20
	}
	current, maxStreak := streakStats(sessions)
	return domain.PublicProfileOverview{
		TotalMinutes:      stats.TotalMinutes,
		TotalSessions:     stats.TotalSessions,
		ActiveDays:        len(agg.daySet),
		AvgSessionMinutes: stats.AvgSessionMinutes,
		LongestSession:    stats.LongestSession,
		ThisWeekMinutes:   stats.ThisWeekMinutes,
		FriendCount:       stats.FriendCount,
		CurrentStreakDays: current,
		MaxStreakDays:     maxStreak,
		WeeklyGoalHours:   weeklyGoalHours,
		AvgMood:           agg.avgMood,
	}
}

func computeSessionViews(sessions []domain.Session, subjectByID map[string]string) []domain.PublicProfileSession {
	views := make([]domain.PublicProfileSession, 0, len(sessions))
	for _, sess := range sessions {
		name := subjectByID[sess.SubjectID]
		if name == "" {
			name = "Unknown"
		}
		views = append(views, domain.PublicProfileSession{
			ID: sess.ID, SubjectID: sess.SubjectID, SubjectName: name,
			Topic: sess.Topic, DurationMin: sess.DurationMin, Mood: sess.Mood, StartedAt: sess.StartedAt,
		})
	}
	return views
}

func computeInsights(agg sessionAggregates) domain.PublicProfileInsights {
	dailyKeys := make([]string, 0, len(agg.dayMinutes))
	for k := range agg.dayMinutes {
		dailyKeys = append(dailyKeys, k)
	}
	sort.Strings(dailyKeys)
	daily := make([]domain.PublicProfileInsightsDaily, 0, len(dailyKeys))
	for _, key := range dailyKeys {
		daily = append(daily, domain.PublicProfileInsightsDaily{DateKey: key, Minutes: agg.dayMinutes[key]})
	}

	weekKeys := make([]string, 0, len(agg.weekMinutes))
	for k := range agg.weekMinutes {
		weekKeys = append(weekKeys, k)
	}
	sort.Strings(weekKeys)
	weekly := make([]domain.PublicProfileInsightsDaily, 0, len(weekKeys))
	for _, key := range weekKeys {
		weekly = append(weekly, domain.PublicProfileInsightsDaily{DateKey: key, Minutes: agg.weekMinutes[key]})
	}

	subjectIDs := make([]string, 0, len(agg.subjectMinutes))
	for id := range agg.subjectMinutes {
		subjectIDs = append(subjectIDs, id)
	}
	sort.Slice(subjectIDs, func(i, j int) bool {
		return agg.subjectMinutes[subjectIDs[i]] > agg.subjectMinutes[subjectIDs[j]]
	})
	subjectBreakdown := make([]domain.PublicProfileInsightsSubject, 0, len(subjectIDs))
	mostSubject := ""
	for idx, subjectID := range subjectIDs {
		entry := domain.PublicProfileInsightsSubject{
			SubjectID: subjectID, SubjectName: agg.subjectNameByID[subjectID], Minutes: agg.subjectMinutes[subjectID],
		}
		subjectBreakdown = append(subjectBreakdown, entry)
		if idx == 0 {
			mostSubject = entry.SubjectName
		}
	}

	peakHour, peakHourMinutes := 0, 0
	for hour, minutes := range agg.hourMinutes {
		if minutes > peakHourMinutes {
			peakHour = hour
			peakHourMinutes = minutes
		}
	}
	return domain.PublicProfileInsights{
		DailyMinutes: daily, WeeklyMinutes: weekly, SubjectBreakdown: subjectBreakdown,
		PeakHourLocal: peakHour, PeakHourMinutes: peakHourMinutes,
		BestDayDateKey: agg.bestDayDate, BestDayMinutes: agg.bestDayMinutes, MostStudiedSubject: mostSubject,
	}
}

func buildPublicProfileDetails(
	stats domain.PublicProfileStats,
	sessions []domain.Session,
	subjects []domain.Subject,
	weeklyGoalHours int,
) (domain.PublicProfileOverview, []domain.PublicProfileSession, domain.PublicProfileInsights, map[string]int) {
	subjectByID := make(map[string]string, len(subjects))
	for _, sub := range subjects {
		subjectByID[sub.ID] = sub.Name
	}
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].StartedAt.After(sessions[j].StartedAt)
	})
	agg := aggregateSessions(sessions, subjectByID)
	overview := computeOverview(stats, agg, sessions, weeklyGoalHours)
	sessionViews := computeSessionViews(sessions, subjectByID)
	insights := computeInsights(agg)
	return overview, sessionViews, insights, agg.dayMinutes
}

func streakStats(sessions []domain.Session) (int, int) {
	if len(sessions) == 0 {
		return 0, 0
	}
	days := make([]time.Time, 0, len(sessions))
	seen := map[string]bool{}
	for _, sess := range sessions {
		d := time.Date(sess.StartedAt.Year(), sess.StartedAt.Month(), sess.StartedAt.Day(), 0, 0, 0, 0, time.UTC)
		key := d.Format("2006-01-02")
		if seen[key] {
			continue
		}
		seen[key] = true
		days = append(days, d)
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Before(days[j]) })
	maxStreak := 1
	cur := 1
	for i := 1; i < len(days); i++ {
		if int(days[i].Sub(days[i-1]).Hours()/24) == 1 {
			cur++
		} else {
			if cur > maxStreak {
				maxStreak = cur
			}
			cur = 1
		}
	}
	if cur > maxStreak {
		maxStreak = cur
	}
	last := days[len(days)-1]
	today := time.Now().UTC()
	todayDay := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)
	yesterday := todayDay.AddDate(0, 0, -1)
	if !last.Equal(todayDay) && !last.Equal(yesterday) {
		return 0, maxStreak
	}
	current := 1
	for i := len(days) - 1; i >= 1; i-- {
		if int(days[i].Sub(days[i-1]).Hours()/24) == 1 {
			current++
		} else {
			break
		}
	}
	return current, maxStreak
}

func (s *ProfileService) computeStats(ctx context.Context, userID string) (domain.PublicProfileStats, error) {
	sessions, err := s.sessionRepo.ListByUser(ctx, userID, nil, nil)
	if err != nil {
		return domain.PublicProfileStats{}, err
	}
	totalMinutes := 0
	longest := 0
	days := map[string]bool{}
	now := time.Now()
	weekAgo := now.AddDate(0, 0, -7)
	thisWeek := 0
	for _, sess := range sessions {
		totalMinutes += sess.DurationMin
		if sess.DurationMin > longest {
			longest = sess.DurationMin
		}
		days[sess.StartedAt.Format("2006-01-02")] = true
		if sess.StartedAt.After(weekAgo) {
			thisWeek += sess.DurationMin
		}
	}
	avg := 0
	if len(sessions) > 0 {
		avg = totalMinutes / len(sessions)
	}
	friends, _ := s.friendRepo.ListFriends(ctx, userID)
	return domain.PublicProfileStats{
		TotalMinutes:      totalMinutes,
		TotalSessions:     len(sessions),
		ActiveDays:        len(days),
		AvgSessionMinutes: avg,
		LongestSession:    longest,
		ThisWeekMinutes:   thisWeek,
		FriendCount:       len(friends),
	}, nil
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

func (s *FriendService) WeeklyLeaderboardInRange(ctx context.Context, userID string, from, to time.Time) ([]domain.FriendLeaderboardEntry, error) {
	return s.friends.ListWeeklyLeaderboard(ctx, userID, from, to)
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
