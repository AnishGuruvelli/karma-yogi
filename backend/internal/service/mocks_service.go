package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
)

const mockTestSubjectName = "MOCK TESTS"

type MocksService struct {
	mocks      database.FullMockRepository
	sectionals database.SectionalTestRepository
	qotd       database.QotdEntryRepository
	sessions   database.SessionRepository
	subjects   database.SubjectRepository
}

func NewMocksService(
	mocks database.FullMockRepository,
	sectionals database.SectionalTestRepository,
	qotd database.QotdEntryRepository,
	sessions database.SessionRepository,
	subjects database.SubjectRepository,
) *MocksService {
	return &MocksService{mocks: mocks, sectionals: sectionals, qotd: qotd, sessions: sessions, subjects: subjects}
}

func (s *MocksService) findOrCreateMockSubject(ctx context.Context, userID string) (domain.Subject, error) {
	sub, err := s.subjects.GetByUserAndName(ctx, userID, mockTestSubjectName)
	if err == nil {
		return sub, nil
	}
	if !errors.Is(err, database.ErrUserNotFound) {
		return domain.Subject{}, err
	}
	prevIcon, _ := s.subjects.GetLatestIcon(ctx, userID)
	return s.subjects.Create(ctx, domain.Subject{
		ID:     uuid.NewString(),
		UserID: userID,
		Name:   mockTestSubjectName,
		Color:  "orange",
		Icon:   pickStudyIcon(prevIcon),
	})
}

func parseMockDate(date string) time.Time {
	if date != "" {
		if t, err := time.Parse("2006-01-02", date); err == nil {
			return t
		}
	}
	return time.Now()
}

func (s *MocksService) CreateFullMock(ctx context.Context, userID string, m domain.FullMock) (domain.FullMock, error) {
	m.ID = uuid.NewString()
	m.UserID = userID
	m.TestName = strings.TrimSpace(m.TestName)
	m.Notes = strings.TrimSpace(m.Notes)
	if m.TestName == "" {
		return domain.FullMock{}, errors.New("test name is required")
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}

	created, err := s.mocks.Create(ctx, m)
	if err != nil {
		return domain.FullMock{}, err
	}

	if m.DurationMin != nil && *m.DurationMin > 0 {
		sub, serr := s.findOrCreateMockSubject(ctx, userID)
		if serr == nil {
			testType := "full"
			sess, serr := s.sessions.Create(ctx, domain.Session{
				ID:             uuid.NewString(),
				UserID:         userID,
				SubjectID:      sub.ID,
				Topic:          created.TestName,
				DurationMin:    *m.DurationMin,
				Mood:           "3",
				StartedAt:      parseMockDate(m.Date),
				Kind:           "test",
				LinkedTestID:   &created.ID,
				LinkedTestType: &testType,
			})
			if serr == nil {
				created.LinkedSessionID = &sess.ID
				if updated, uerr := s.mocks.Update(ctx, created); uerr == nil {
					created = updated
				}
			}
		}
	}
	return created, nil
}

func (s *MocksService) ListFullMocks(ctx context.Context, userID string) ([]domain.FullMock, error) {
	return s.mocks.ListByUser(ctx, userID)
}

func (s *MocksService) UpdateFullMock(ctx context.Context, userID, id string, m domain.FullMock) (domain.FullMock, error) {
	m.ID = id
	m.UserID = userID
	m.TestName = strings.TrimSpace(m.TestName)
	m.Notes = strings.TrimSpace(m.Notes)
	if m.TestName == "" {
		return domain.FullMock{}, errors.New("test name is required")
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}
	return s.mocks.Update(ctx, m)
}

func (s *MocksService) DeleteFullMock(ctx context.Context, userID, id string) error {
	return s.mocks.Delete(ctx, userID, id)
}

func (s *MocksService) CreateSectional(ctx context.Context, userID string, st domain.SectionalTest) (domain.SectionalTest, error) {
	st.ID = uuid.NewString()
	st.UserID = userID
	st.TestName = strings.TrimSpace(st.TestName)
	st.Section = strings.TrimSpace(st.Section)
	st.Notes = strings.TrimSpace(st.Notes)
	if st.TestName == "" {
		return domain.SectionalTest{}, errors.New("test name is required")
	}
	if st.Section == "" {
		return domain.SectionalTest{}, errors.New("section is required")
	}
	if st.Tags == nil {
		st.Tags = []string{}
	}

	created, err := s.sectionals.Create(ctx, st)
	if err != nil {
		return domain.SectionalTest{}, err
	}

	if st.DurationMin != nil && *st.DurationMin > 0 {
		sub, serr := s.findOrCreateMockSubject(ctx, userID)
		if serr == nil {
			testType := "sectional"
			topic := created.Section + " — " + created.TestName
			sess, serr := s.sessions.Create(ctx, domain.Session{
				ID:             uuid.NewString(),
				UserID:         userID,
				SubjectID:      sub.ID,
				Topic:          topic,
				DurationMin:    *st.DurationMin,
				Mood:           "3",
				StartedAt:      parseMockDate(st.Date),
				Kind:           "test",
				LinkedTestID:   &created.ID,
				LinkedTestType: &testType,
			})
			if serr == nil {
				created.LinkedSessionID = &sess.ID
				if updated, uerr := s.sectionals.Update(ctx, created); uerr == nil {
					created = updated
				}
			}
		}
	}
	return created, nil
}

func (s *MocksService) ListSectionals(ctx context.Context, userID string) ([]domain.SectionalTest, error) {
	return s.sectionals.ListByUser(ctx, userID)
}

func (s *MocksService) UpdateSectional(ctx context.Context, userID, id string, st domain.SectionalTest) (domain.SectionalTest, error) {
	st.ID = id
	st.UserID = userID
	st.TestName = strings.TrimSpace(st.TestName)
	st.Section = strings.TrimSpace(st.Section)
	st.Notes = strings.TrimSpace(st.Notes)
	if st.TestName == "" {
		return domain.SectionalTest{}, errors.New("test name is required")
	}
	if st.Section == "" {
		return domain.SectionalTest{}, errors.New("section is required")
	}
	if st.Tags == nil {
		st.Tags = []string{}
	}
	return s.sectionals.Update(ctx, st)
}

func (s *MocksService) DeleteSectional(ctx context.Context, userID, id string) error {
	return s.sectionals.Delete(ctx, userID, id)
}

func (s *MocksService) CreateQotdEntry(ctx context.Context, userID string, e domain.QotdEntry) (domain.QotdEntry, error) {
	e.ID = uuid.NewString()
	e.UserID = userID
	e.Topic = strings.TrimSpace(e.Topic)
	e.Source = strings.TrimSpace(e.Source)
	e.Note = strings.TrimSpace(e.Note)
	if e.Topic == "" {
		return domain.QotdEntry{}, errors.New("topic is required")
	}
	return s.qotd.Create(ctx, e)
}

func (s *MocksService) ListQotdEntries(ctx context.Context, userID string) ([]domain.QotdEntry, error) {
	return s.qotd.ListByUser(ctx, userID)
}

func (s *MocksService) UpdateQotdEntry(ctx context.Context, userID, id string, e domain.QotdEntry) (domain.QotdEntry, error) {
	return s.qotd.Update(ctx, userID, id, e)
}

func (s *MocksService) DeleteQotdEntry(ctx context.Context, userID, id string) error {
	return s.qotd.Delete(ctx, userID, id)
}
