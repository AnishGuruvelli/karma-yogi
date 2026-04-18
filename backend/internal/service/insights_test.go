package service

import (
	"context"
	"testing"
	"time"

	"github.com/karma-yogi/backend/internal/domain"
)

type fakeSessionRepo struct{ sessions []domain.Session }

func (f *fakeSessionRepo) Create(context.Context, domain.Session) (domain.Session, error) {
	return domain.Session{}, nil
}
func (f *fakeSessionRepo) Update(context.Context, domain.Session) (domain.Session, error) {
	return domain.Session{}, nil
}
func (f *fakeSessionRepo) ListByUser(ctx context.Context, userID string, from, to *time.Time) ([]domain.Session, error) {
	if from == nil {
		return f.sessions, nil
	}
	out := []domain.Session{}
	for _, s := range f.sessions {
		if s.StartedAt.After(*from) || s.StartedAt.Equal(*from) {
			out = append(out, s)
		}
	}
	return out, nil
}
func (f *fakeSessionRepo) Delete(context.Context, string, string) error { return nil }

type fakeGoalRepo struct{ goals []domain.Goal }

func (f *fakeGoalRepo) Create(context.Context, domain.Goal) (domain.Goal, error) {
	return domain.Goal{}, nil
}
func (f *fakeGoalRepo) ListByUser(context.Context, string) ([]domain.Goal, error) {
	return f.goals, nil
}
func (f *fakeGoalRepo) Update(context.Context, domain.Goal) (domain.Goal, error) {
	return domain.Goal{}, nil
}
func (f *fakeGoalRepo) Delete(context.Context, string, string) error { return nil }

func TestInsightsService(t *testing.T) {
	now := time.Now()
	svc := NewInsightsService(&fakeSessionRepo{sessions: []domain.Session{{DurationMin: 60, StartedAt: now}, {DurationMin: 30, StartedAt: now.AddDate(0, 0, -10)}}}, &fakeGoalRepo{goals: []domain.Goal{{TargetMinutes: 200}}})
	ins, err := svc.Get(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if ins.TotalMinutes != 90 {
		t.Fatalf("expected total 90, got %d", ins.TotalMinutes)
	}
	if ins.SessionCount != 2 {
		t.Fatalf("expected sessions 2, got %d", ins.SessionCount)
	}
}
