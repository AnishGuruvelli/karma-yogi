package service

import "testing"

func TestCurrentStreakUTC_consecutiveEndingToday(t *testing.T) {
	ds := map[string]struct{}{
		"2026-05-01": {},
		"2026-05-02": {},
		"2026-05-03": {},
	}
	if got := currentStreakUTC(ds, "2026-05-03"); got != 3 {
		t.Fatalf("expected streak 3, got %d", got)
	}
}

func TestCurrentStreakUTC_breaksWhenTodayMissing(t *testing.T) {
	ds := map[string]struct{}{
		"2026-05-01": {},
		"2026-05-02": {},
	}
	if got := currentStreakUTC(ds, "2026-05-03"); got != 0 {
		t.Fatalf("expected streak 0 when today has no session, got %d", got)
	}
}
