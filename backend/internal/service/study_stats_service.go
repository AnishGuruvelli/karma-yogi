package service

import (
	"context"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
)

type StudyStatsService struct {
	sessions database.SessionRepository
}

func NewStudyStatsService(sessions database.SessionRepository) *StudyStatsService {
	return &StudyStatsService{sessions: sessions}
}

// weekRangeMonday returns [from, to) for the ISO-style week (Mon 00:00 → next Mon 00:00) in loc.
func weekRangeMonday(now time.Time, loc *time.Location) (from, to time.Time) {
	n := now.In(loc)
	wd := int(n.Weekday())
	if wd == 0 {
		wd = 7
	}
	from = time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, loc).AddDate(0, 0, -(wd - 1))
	to = from.AddDate(0, 0, 7)
	return from, to
}

func parseMood(mood string) (float64, bool) {
	s := strings.TrimSpace(mood)
	if s == "" {
		return 0, false
	}
	if v, err := strconv.ParseFloat(s, 64); err == nil && !math.IsNaN(v) {
		return v, true
	}
	if v, err := strconv.Atoi(s); err == nil {
		return float64(v), true
	}
	return 0, false
}

// Summary aggregates all sessions for the user (authoritative totals). Weekly minutes use
// calendar Monday–Sunday in the requested IANA timezone (query param `tz`); invalid tz falls back to UTC.
func (s *StudyStatsService) Summary(ctx context.Context, userID, tzName string) (domain.StudyStatsSummary, error) {
	all, err := s.sessions.ListByUser(ctx, userID, nil, nil)
	if err != nil {
		return domain.StudyStatsSummary{}, err
	}
	loc, locErr := time.LoadLocation(tzName)
	if locErr != nil {
		loc = time.UTC
		tzName = "UTC"
	}

	from, to := weekRangeMonday(time.Now(), loc)

	totalMin := 0
	longest := 0
	moodSum := 0.0
	moodN := 0
	days := make(map[string]struct{})
	weekMin := 0

	for _, sess := range all {
		totalMin += sess.DurationMin
		if sess.DurationMin > longest {
			longest = sess.DurationMin
		}
		if v, ok := parseMood(sess.Mood); ok {
			moodSum += v
			moodN++
		}
		days[sess.StartedAt.In(loc).Format("2006-01-02")] = struct{}{}
		if !sess.StartedAt.Before(from) && sess.StartedAt.Before(to) {
			weekMin += sess.DurationMin
		}
	}

	n := len(all)
	avg := 0
	if n > 0 {
		avg = totalMin / n
	}
	avgMood := 0.0
	if moodN > 0 {
		avgMood = moodSum / float64(moodN)
	}

	return domain.StudyStatsSummary{
		TotalMinutes:          totalMin,
		TotalSessions:         n,
		AvgSessionMinutes:     avg,
		LongestSessionMinutes: longest,
		AvgMood:               avgMood,
		ActiveDistinctDays:    len(days),
		WeekMinutesCurrent:    weekMin,
		TimezoneUsed:          tzName,
	}, nil
}
