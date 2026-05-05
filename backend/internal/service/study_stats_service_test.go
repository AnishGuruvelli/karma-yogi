package service

import (
	"testing"
	"time"
)

func TestWeekRangeMondayUTC(t *testing.T) {
	loc := time.UTC
	// Wednesday 2026-05-06 15:00 UTC
	wed := time.Date(2026, 5, 6, 15, 0, 0, 0, loc)
	from, to := weekRangeMonday(wed, loc)
	expFrom := time.Date(2026, 5, 4, 0, 0, 0, 0, loc)
	expTo := time.Date(2026, 5, 11, 0, 0, 0, 0, loc)
	if !from.Equal(expFrom) || !to.Equal(expTo) {
		t.Fatalf("from=%v to=%v want from=%v to=%v", from, to, expFrom, expTo)
	}
}

func TestParseMood(t *testing.T) {
	if v, ok := parseMood(" 4 "); !ok || v != 4 {
		t.Fatalf("parse 4: ok=%v v=%v", ok, v)
	}
	if v, ok := parseMood("4.5"); !ok || v != 4.5 {
		t.Fatalf("parse 4.5: ok=%v v=%v", ok, v)
	}
	if _, ok := parseMood(""); ok {
		t.Fatal("empty should fail")
	}
}
