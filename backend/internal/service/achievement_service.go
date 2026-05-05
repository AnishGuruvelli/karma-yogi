package service

import (
	"context"
	"sort"
	"time"

	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
)

type AchievementService struct {
	sessions database.SessionRepository
	friends  database.FriendRepository
}

func NewAchievementService(sessions database.SessionRepository, friends database.FriendRepository) *AchievementService {
	return &AchievementService{sessions: sessions, friends: friends}
}

func sessionDayUTC(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

func noonUTC(d time.Time) time.Time {
	u := d.UTC()
	return time.Date(u.Year(), u.Month(), u.Day(), 12, 0, 0, 0, time.UTC)
}

// currentStreakUTC counts consecutive calendar days (UTC) with at least one session, ending on endKey (inclusive).
func currentStreakUTC(daySet map[string]struct{}, endKey string) int {
	d, err := time.Parse("2006-01-02", endKey)
	if err != nil {
		return 0
	}
	d = d.UTC()
	streak := 0
	for {
		key := d.Format("2006-01-02")
		if _, ok := daySet[key]; !ok {
			break
		}
		streak++
		d = d.AddDate(0, 0, -1)
	}
	return streak
}

func streakEarnedAtUTC(streak, need int, today time.Time) *time.Time {
	if streak < need {
		return nil
	}
	end := today.UTC()
	hitDay := end.AddDate(0, 0, -(streak - need))
	t := noonUTC(hitDay)
	return &t
}

// ListMine computes achievement eligibility from sessions and friends (authoritative; not stored).
func (s *AchievementService) ListMine(ctx context.Context, userID string) ([]domain.UserAchievement, error) {
	sessions, err := s.sessions.ListByUser(ctx, userID, nil, nil)
	if err != nil {
		return nil, err
	}
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].StartedAt.Before(sessions[j].StartedAt)
	})

	daySet := make(map[string]struct{})
	for _, sess := range sessions {
		daySet[sessionDayUTC(sess.StartedAt)] = struct{}{}
	}
	todayKey := time.Now().UTC().Format("2006-01-02")
	streak := currentStreakUTC(daySet, todayKey)
	today := time.Now().UTC()

	var firstSessionAt *time.Time
	var deepWorkAt *time.Time
	var centuryAt *time.Time
	var subjectMasterAt *time.Time

	if len(sessions) > 0 {
		t := sessions[0].StartedAt
		firstSessionAt = &t
	}
	for i := range sessions {
		if sessions[i].DurationMin >= 120 {
			t := sessions[i].StartedAt
			deepWorkAt = &t
			break
		}
	}
	cum := 0
	const centuryMins = 100 * 60
	for i := range sessions {
		cum += sessions[i].DurationMin
		if cum >= centuryMins {
			t := sessions[i].StartedAt
			centuryAt = &t
			break
		}
	}
	seenSubjects := make(map[string]struct{})
	for i := range sessions {
		sid := sessions[i].SubjectID
		if sid == "" {
			continue
		}
		if _, dup := seenSubjects[sid]; dup {
			continue
		}
		seenSubjects[sid] = struct{}{}
		if len(seenSubjects) == 3 {
			t := sessions[i].StartedAt
			subjectMasterAt = &t
			break
		}
	}

	friendTimes, err := s.friends.ListFriendshipsCreatedAsc(ctx, userID)
	if err != nil {
		return nil, err
	}
	var socialAt *time.Time
	if len(friendTimes) >= 3 {
		t := friendTimes[2]
		socialAt = &t
	}

	sevenAt := streakEarnedAtUTC(streak, 7, today)
	fourteenAt := streakEarnedAtUTC(streak, 14, today)

	out := []domain.UserAchievement{
		{Key: "seven_day_streak", Earned: streak >= 7, EarnedAt: sevenAt},
		{Key: "fourteen_day_warrior", Earned: streak >= 14, EarnedAt: fourteenAt},
		{Key: "century_club", Earned: centuryAt != nil, EarnedAt: centuryAt},
		{Key: "first_session", Earned: len(sessions) >= 1, EarnedAt: firstSessionAt},
		{Key: "deep_work", Earned: deepWorkAt != nil, EarnedAt: deepWorkAt},
		{Key: "social_studier", Earned: len(friendTimes) >= 3, EarnedAt: socialAt},
		{Key: "subject_master", Earned: len(seenSubjects) >= 3, EarnedAt: subjectMasterAt},
		{Key: "goal_crusher", Earned: false, EarnedAt: nil},
		{Key: "early_bird", Earned: false, EarnedAt: nil},
		{Key: "mock_master", Earned: false, EarnedAt: nil},
	}
	return out, nil
}
