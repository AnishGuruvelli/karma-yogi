package database

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/karma-yogi/backend/internal/domain"
)

type Repositories struct {
	Users          UserRepository
	Subjects       SubjectRepository
	Sessions       SessionRepository
	Goals          GoalRepository
	ExamGoals      ExamGoalRepository
	PublicProfiles UserPublicProfileRepository
	Preferences    UserPreferencesRepository
	Privacy        UserPrivacyRepository
	Timer          TimerStateRepository
	Friends        FriendRepository
	Auth           AuthRepository
}

func NewRepositories(pool *pgxpool.Pool) Repositories {
	return Repositories{
		Users:          &pgUserRepo{pool: pool},
		Subjects:       &pgSubjectRepo{pool: pool},
		Sessions:       &pgSessionRepo{pool: pool},
		Goals:          &pgGoalRepo{pool: pool},
		ExamGoals:      &pgExamGoalRepo{pool: pool},
		PublicProfiles: &pgUserPublicProfileRepo{pool: pool},
		Preferences:    &pgUserPreferencesRepo{pool: pool},
		Privacy:        &pgUserPrivacyRepo{pool: pool},
		Timer:          &pgTimerStateRepo{pool: pool},
		Friends:        &pgFriendRepo{pool: pool},
		Auth:           &pgAuthRepo{pool: pool},
	}
}

type pgUserRepo struct{ pool *pgxpool.Pool }

func (r *pgUserRepo) UpsertGoogleUser(ctx context.Context, email, fullName, avatarURL, googleSub string) (domain.User, error) {
	q := `INSERT INTO users (id,email,full_name,username,phone,avatar_url,google_sub) VALUES ($1,$2,$3,split_part($2,'@',1),'',$4,$5)
	ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, avatar_url=EXCLUDED.avatar_url, google_sub=EXCLUDED.google_sub, updated_at=now()
	RETURNING id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at`
	id := uuid.NewString()
	var u domain.User
	err := r.pool.QueryRow(ctx, q, id, email, fullName, avatarURL, googleSub).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *pgUserRepo) CreateWithPassword(ctx context.Context, email, fullName, passwordHash, secretAnswerHash string) (domain.User, error) {
	q := `INSERT INTO users (id,email,full_name,username,phone,avatar_url,google_sub,password_hash,secret_answer_hash)
	VALUES ($1,$2,$3,split_part($2,'@',1),'','','',$4,$5)
	RETURNING id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at`
	id := uuid.NewString()
	var u domain.User
	err := r.pool.QueryRow(ctx, q, id, email, fullName, passwordHash, secretAnswerHash).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *pgUserRepo) GetByEmail(ctx context.Context, email string) (domain.User, error) {
	q := `SELECT id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at FROM users WHERE email=$1`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, email).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		return domain.User{}, err
	}
	return u, nil
}

func (r *pgUserRepo) GetByID(ctx context.Context, id string) (domain.User, error) {
	q := `SELECT id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at FROM users WHERE id=$1`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, id).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		return domain.User{}, err
	}
	return u, nil
}

func (r *pgUserRepo) GetByUsername(ctx context.Context, username string) (domain.User, error) {
	q := `SELECT id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at FROM users WHERE lower(username)=lower($1) LIMIT 1`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, username).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		return domain.User{}, err
	}
	return u, nil
}
func (r *pgUserRepo) ListOthers(ctx context.Context, userID string) ([]domain.User, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at
		FROM users WHERE id <> $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.User{}
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}
func (r *pgUserRepo) UpdateProfile(ctx context.Context, id, fullName, username, phone, avatarURL string) (domain.User, error) {
	q := `UPDATE users SET full_name=$2, username=$3, phone=$4, avatar_url=$5, updated_at=now() WHERE id=$1 RETURNING id,email,full_name,username,phone,avatar_url,google_sub,COALESCE(password_hash,''),COALESCE(secret_answer_hash,''),created_at,updated_at`
	var u domain.User
	err := r.pool.QueryRow(ctx, q, id, fullName, username, phone, avatarURL).Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (r *pgUserRepo) UpdatePasswordHash(ctx context.Context, userID, passwordHash string) error {
	ct, err := r.pool.Exec(ctx, `UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1`, userID, passwordHash)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

type pgSessionRepo struct{ pool *pgxpool.Pool }

func (r *pgSessionRepo) Create(ctx context.Context, s domain.Session) (domain.Session, error) {
	q := `INSERT INTO sessions (id,user_id,subject,subject_id,topic,duration_min,mood,started_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	RETURNING id,user_id,subject_id,topic,duration_min,mood,started_at,created_at`
	err := r.pool.QueryRow(ctx, q, s.ID, s.UserID, s.Topic, s.SubjectID, s.Topic, s.DurationMin, s.Mood, s.StartedAt).Scan(&s.ID, &s.UserID, &s.SubjectID, &s.Topic, &s.DurationMin, &s.Mood, &s.StartedAt, &s.CreatedAt)
	return s, err
}
func (r *pgSessionRepo) Update(ctx context.Context, s domain.Session) (domain.Session, error) {
	q := `UPDATE sessions
	SET subject_id=$3,topic=$4,duration_min=$5,mood=$6,started_at=$7
	WHERE id=$1 AND user_id=$2
	RETURNING id,user_id,COALESCE(subject_id::text,''),COALESCE(topic,subject,'General study'),duration_min,mood,started_at,created_at`
	err := r.pool.QueryRow(ctx, q, s.ID, s.UserID, s.SubjectID, s.Topic, s.DurationMin, s.Mood, s.StartedAt).Scan(&s.ID, &s.UserID, &s.SubjectID, &s.Topic, &s.DurationMin, &s.Mood, &s.StartedAt, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Session{}, errors.New("not found")
		}
		return domain.Session{}, err
	}
	return s, nil
}
func (r *pgSessionRepo) ListByUser(ctx context.Context, userID string, from, to *time.Time) ([]domain.Session, error) {
	q := `SELECT
		id,
		user_id,
		COALESCE(subject_id::text, ''),
		COALESCE(topic, subject, 'General study'),
		duration_min,
		mood,
		started_at,
		created_at
	FROM sessions WHERE user_id=$1
	AND ($2::timestamptz IS NULL OR started_at >= $2)
	AND ($3::timestamptz IS NULL OR started_at <= $3)
	ORDER BY started_at DESC`
	rows, err := r.pool.Query(ctx, q, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Session{}
	for rows.Next() {
		var s domain.Session
		if err := rows.Scan(&s.ID, &s.UserID, &s.SubjectID, &s.Topic, &s.DurationMin, &s.Mood, &s.StartedAt, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
func (r *pgSessionRepo) Delete(ctx context.Context, id, userID string) error {
	ct, err := r.pool.Exec(ctx, `DELETE FROM sessions WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}

type pgGoalRepo struct{ pool *pgxpool.Pool }
type pgExamGoalRepo struct{ pool *pgxpool.Pool }
type pgUserPublicProfileRepo struct{ pool *pgxpool.Pool }
type pgUserPreferencesRepo struct{ pool *pgxpool.Pool }
type pgUserPrivacyRepo struct{ pool *pgxpool.Pool }

type pgSubjectRepo struct{ pool *pgxpool.Pool }

func (r *pgSubjectRepo) Create(ctx context.Context, s domain.Subject) (domain.Subject, error) {
	q := `INSERT INTO subjects (id,user_id,name,color,icon) VALUES ($1,$2,$3,$4,$5)
	RETURNING id,user_id,name,color,icon,created_at`
	err := r.pool.QueryRow(ctx, q, s.ID, s.UserID, s.Name, s.Color, s.Icon).Scan(&s.ID, &s.UserID, &s.Name, &s.Color, &s.Icon, &s.CreatedAt)
	return s, err
}
func (r *pgSubjectRepo) ListByUser(ctx context.Context, userID string) ([]domain.Subject, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,user_id,name,color,icon,created_at FROM subjects WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Subject{}
	for rows.Next() {
		var s domain.Subject
		if err := rows.Scan(&s.ID, &s.UserID, &s.Name, &s.Color, &s.Icon, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
func (r *pgSubjectRepo) GetByUserAndName(ctx context.Context, userID, name string) (domain.Subject, error) {
	var s domain.Subject
	err := r.pool.QueryRow(ctx, `SELECT id,user_id,name,color,icon,created_at FROM subjects WHERE user_id=$1 AND lower(name)=lower($2) LIMIT 1`, userID, name).
		Scan(&s.ID, &s.UserID, &s.Name, &s.Color, &s.Icon, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Subject{}, ErrUserNotFound
		}
		return domain.Subject{}, err
	}
	return s, nil
}
func (r *pgSubjectRepo) GetLatestIcon(ctx context.Context, userID string) (string, error) {
	var icon string
	err := r.pool.QueryRow(ctx, `SELECT icon FROM subjects WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, userID).Scan(&icon)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return icon, nil
}
func (r *pgSubjectRepo) UpdateColor(ctx context.Context, id, userID, color string) (domain.Subject, error) {
	var s domain.Subject
	err := r.pool.QueryRow(ctx, `UPDATE subjects SET color=$3 WHERE id=$1 AND user_id=$2 RETURNING id,user_id,name,color,icon,created_at`, id, userID, color).
		Scan(&s.ID, &s.UserID, &s.Name, &s.Color, &s.Icon, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Subject{}, errors.New("not found")
		}
		return domain.Subject{}, err
	}
	return s, nil
}
func (r *pgSubjectRepo) Delete(ctx context.Context, id, userID string) error {
	ct, err := r.pool.Exec(ctx, `DELETE FROM subjects WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}

func (r *pgGoalRepo) Create(ctx context.Context, g domain.Goal) (domain.Goal, error) {
	q := `INSERT INTO goals (id,user_id,title,target_minutes,deadline) VALUES ($1,$2,$3,$4,$5)
	RETURNING id,user_id,title,target_minutes,deadline,created_at,updated_at`
	err := r.pool.QueryRow(ctx, q, g.ID, g.UserID, g.Title, g.TargetMinutes, g.Deadline).Scan(&g.ID, &g.UserID, &g.Title, &g.TargetMinutes, &g.Deadline, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}
func (r *pgGoalRepo) ListByUser(ctx context.Context, userID string) ([]domain.Goal, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,user_id,title,target_minutes,deadline,created_at,updated_at FROM goals WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.Goal{}
	for rows.Next() {
		var g domain.Goal
		if err := rows.Scan(&g.ID, &g.UserID, &g.Title, &g.TargetMinutes, &g.Deadline, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}
func (r *pgGoalRepo) Update(ctx context.Context, g domain.Goal) (domain.Goal, error) {
	err := r.pool.QueryRow(ctx, `UPDATE goals SET title=$3,target_minutes=$4,deadline=$5,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,user_id,title,target_minutes,deadline,created_at,updated_at`, g.ID, g.UserID, g.Title, g.TargetMinutes, g.Deadline).Scan(&g.ID, &g.UserID, &g.Title, &g.TargetMinutes, &g.Deadline, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}
func (r *pgGoalRepo) Delete(ctx context.Context, id, userID string) error {
	ct, err := r.pool.Exec(ctx, `DELETE FROM goals WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("not found")
	}
	return nil
}

func (r *pgExamGoalRepo) GetByUser(ctx context.Context, userID string) (domain.ExamGoal, error) {
	var g domain.ExamGoal
	err := r.pool.QueryRow(ctx, `SELECT id,user_id,name,exam_date,created_at,updated_at FROM exam_goals WHERE user_id=$1`, userID).
		Scan(&g.ID, &g.UserID, &g.Name, &g.ExamDate, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ExamGoal{}, ErrUserNotFound
		}
		return domain.ExamGoal{}, err
	}
	return g, nil
}

func (r *pgExamGoalRepo) Upsert(ctx context.Context, g domain.ExamGoal) (domain.ExamGoal, error) {
	q := `INSERT INTO exam_goals (id,user_id,name,exam_date) VALUES ($1,$2,$3,$4)
		ON CONFLICT (user_id) DO UPDATE SET name=EXCLUDED.name, exam_date=EXCLUDED.exam_date, updated_at=now()
		RETURNING id,user_id,name,exam_date,created_at,updated_at`
	err := r.pool.QueryRow(ctx, q, g.ID, g.UserID, g.Name, g.ExamDate).
		Scan(&g.ID, &g.UserID, &g.Name, &g.ExamDate, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}

func (r *pgExamGoalRepo) DeleteByUser(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM exam_goals WHERE user_id=$1`, userID)
	return err
}

func (r *pgUserPublicProfileRepo) GetByUser(ctx context.Context, userID string) (domain.UserPublicProfile, error) {
	var p domain.UserPublicProfile
	_, err := r.pool.Exec(ctx, `INSERT INTO user_public_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return domain.UserPublicProfile{}, err
	}
	err = r.pool.QueryRow(ctx, `SELECT user_id,bio,location,education,occupation,target_exam,target_college,created_at,updated_at
		FROM user_public_profiles WHERE user_id=$1`, userID).Scan(
		&p.UserID, &p.Bio, &p.Location, &p.Education, &p.Occupation, &p.TargetExam, &p.TargetCollege, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func (r *pgUserPublicProfileRepo) Upsert(ctx context.Context, profile domain.UserPublicProfile) (domain.UserPublicProfile, error) {
	q := `INSERT INTO user_public_profiles (user_id,bio,location,education,occupation,target_exam,target_college)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (user_id) DO UPDATE
		SET bio=EXCLUDED.bio, location=EXCLUDED.location, education=EXCLUDED.education, occupation=EXCLUDED.occupation,
			target_exam=EXCLUDED.target_exam, target_college=EXCLUDED.target_college, updated_at=now()
		RETURNING user_id,bio,location,education,occupation,target_exam,target_college,created_at,updated_at`
	err := r.pool.QueryRow(ctx, q, profile.UserID, profile.Bio, profile.Location, profile.Education, profile.Occupation, profile.TargetExam, profile.TargetCollege).Scan(
		&profile.UserID, &profile.Bio, &profile.Location, &profile.Education, &profile.Occupation, &profile.TargetExam, &profile.TargetCollege, &profile.CreatedAt, &profile.UpdatedAt,
	)
	return profile, err
}

func (r *pgUserPreferencesRepo) GetByUser(ctx context.Context, userID string) (domain.UserPreferences, error) {
	var p domain.UserPreferences
	_, err := r.pool.Exec(ctx, `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return domain.UserPreferences{}, err
	}
	err = r.pool.QueryRow(ctx, `SELECT user_id,preferred_study_time,default_session_minutes,break_minutes,pomodoro_cycles,study_level,weekly_goal_hours,email_notifications,push_notifications,reminder_notifications,marketing_notifications,show_strategy_page,created_at,updated_at
		FROM user_preferences WHERE user_id=$1`, userID).Scan(
		&p.UserID, &p.PreferredStudyTime, &p.DefaultSessionMinutes, &p.BreakMinutes, &p.PomodoroCycles, &p.StudyLevel, &p.WeeklyGoalHours, &p.EmailNotifications, &p.PushNotifications, &p.ReminderNotifications, &p.MarketingNotifications, &p.ShowStrategyPage, &p.CreatedAt, &p.UpdatedAt,
	)
	return p, err
}

func (r *pgUserPreferencesRepo) Upsert(ctx context.Context, preferences domain.UserPreferences) (domain.UserPreferences, error) {
	q := `INSERT INTO user_preferences (user_id,preferred_study_time,default_session_minutes,break_minutes,pomodoro_cycles,study_level,weekly_goal_hours,email_notifications,push_notifications,reminder_notifications,marketing_notifications,show_strategy_page)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		ON CONFLICT (user_id) DO UPDATE SET
			preferred_study_time=EXCLUDED.preferred_study_time,
			default_session_minutes=EXCLUDED.default_session_minutes,
			break_minutes=EXCLUDED.break_minutes,
			pomodoro_cycles=EXCLUDED.pomodoro_cycles,
			study_level=EXCLUDED.study_level,
			weekly_goal_hours=EXCLUDED.weekly_goal_hours,
			email_notifications=EXCLUDED.email_notifications,
			push_notifications=EXCLUDED.push_notifications,
			reminder_notifications=EXCLUDED.reminder_notifications,
			marketing_notifications=EXCLUDED.marketing_notifications,
			show_strategy_page=EXCLUDED.show_strategy_page,
			updated_at=now()
		RETURNING user_id,preferred_study_time,default_session_minutes,break_minutes,pomodoro_cycles,study_level,weekly_goal_hours,email_notifications,push_notifications,reminder_notifications,marketing_notifications,show_strategy_page,created_at,updated_at`
	err := r.pool.QueryRow(ctx, q, preferences.UserID, preferences.PreferredStudyTime, preferences.DefaultSessionMinutes, preferences.BreakMinutes, preferences.PomodoroCycles, preferences.StudyLevel, preferences.WeeklyGoalHours, preferences.EmailNotifications, preferences.PushNotifications, preferences.ReminderNotifications, preferences.MarketingNotifications, preferences.ShowStrategyPage).Scan(
		&preferences.UserID, &preferences.PreferredStudyTime, &preferences.DefaultSessionMinutes, &preferences.BreakMinutes, &preferences.PomodoroCycles, &preferences.StudyLevel, &preferences.WeeklyGoalHours, &preferences.EmailNotifications, &preferences.PushNotifications, &preferences.ReminderNotifications, &preferences.MarketingNotifications, &preferences.ShowStrategyPage, &preferences.CreatedAt, &preferences.UpdatedAt,
	)
	return preferences, err
}

func (r *pgUserPrivacyRepo) GetByUser(ctx context.Context, userID string) (domain.UserPrivacySettings, error) {
	var p domain.UserPrivacySettings
	_, err := r.pool.Exec(ctx, `INSERT INTO user_privacy_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return domain.UserPrivacySettings{}, err
	}
	err = r.pool.QueryRow(ctx, `SELECT user_id,profile_public,show_stats,show_leaderboard,created_at,updated_at
		FROM user_privacy_settings WHERE user_id=$1`, userID).Scan(&p.UserID, &p.ProfilePublic, &p.ShowStats, &p.ShowLeaderboard, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (r *pgUserPrivacyRepo) Upsert(ctx context.Context, privacy domain.UserPrivacySettings) (domain.UserPrivacySettings, error) {
	q := `INSERT INTO user_privacy_settings (user_id,profile_public,show_stats,show_leaderboard)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (user_id) DO UPDATE SET
			profile_public=EXCLUDED.profile_public,
			show_stats=EXCLUDED.show_stats,
			show_leaderboard=EXCLUDED.show_leaderboard,
			updated_at=now()
		RETURNING user_id,profile_public,show_stats,show_leaderboard,created_at,updated_at`
	err := r.pool.QueryRow(ctx, q, privacy.UserID, privacy.ProfilePublic, privacy.ShowStats, privacy.ShowLeaderboard).
		Scan(&privacy.UserID, &privacy.ProfilePublic, &privacy.ShowStats, &privacy.ShowLeaderboard, &privacy.CreatedAt, &privacy.UpdatedAt)
	return privacy, err
}

type pgAuthRepo struct{ pool *pgxpool.Pool }
type pgFriendRepo struct{ pool *pgxpool.Pool }

type pgTimerStateRepo struct{ pool *pgxpool.Pool }

func (r *pgTimerStateRepo) Get(ctx context.Context, userID string) ([]byte, error) {
	var state []byte
	err := r.pool.QueryRow(ctx, `SELECT state FROM user_timer_state WHERE user_id=$1`, userID).Scan(&state)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return state, nil
}

func (r *pgTimerStateRepo) Upsert(ctx context.Context, userID string, state []byte) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO user_timer_state (user_id,state,updated_at) VALUES ($1,$2,now())
		ON CONFLICT (user_id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()`, userID, state)
	return err
}

func (r *pgTimerStateRepo) Delete(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM user_timer_state WHERE user_id=$1`, userID)
	return err
}

func (r *pgFriendRepo) SendRequest(ctx context.Context, req domain.FriendRequest) (domain.FriendRequest, error) {
	q := `INSERT INTO friend_requests (id,sender_id,receiver_id,status)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (sender_id, receiver_id) DO UPDATE
		SET status='pending', responded_at=NULL, created_at=now()
		RETURNING id,sender_id,receiver_id,status,created_at,responded_at`
	err := r.pool.QueryRow(ctx, q, req.ID, req.SenderID, req.ReceiverID, req.Status).
		Scan(&req.ID, &req.SenderID, &req.ReceiverID, &req.Status, &req.CreatedAt, &req.RespondedAt)
	return req, err
}

func (r *pgFriendRepo) ListIncomingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,sender_id,receiver_id,status,created_at,responded_at
		FROM friend_requests WHERE receiver_id=$1 AND status='pending' ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.FriendRequest{}
	for rows.Next() {
		var fr domain.FriendRequest
		if err := rows.Scan(&fr.ID, &fr.SenderID, &fr.ReceiverID, &fr.Status, &fr.CreatedAt, &fr.RespondedAt); err != nil {
			return nil, err
		}
		out = append(out, fr)
	}
	return out, rows.Err()
}

func (r *pgFriendRepo) ListOutgoingRequests(ctx context.Context, userID string) ([]domain.FriendRequest, error) {
	rows, err := r.pool.Query(ctx, `SELECT id,sender_id,receiver_id,status,created_at,responded_at
		FROM friend_requests WHERE sender_id=$1 AND status='pending' ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.FriendRequest{}
	for rows.Next() {
		var fr domain.FriendRequest
		if err := rows.Scan(&fr.ID, &fr.SenderID, &fr.ReceiverID, &fr.Status, &fr.CreatedAt, &fr.RespondedAt); err != nil {
			return nil, err
		}
		out = append(out, fr)
	}
	return out, rows.Err()
}

func (r *pgFriendRepo) AcceptRequest(ctx context.Context, requestID, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var senderID, receiverID string
	err = tx.QueryRow(ctx, `UPDATE friend_requests SET status='accepted', responded_at=now()
		WHERE id=$1 AND receiver_id=$2 AND status='pending'
		RETURNING sender_id,receiver_id`, requestID, userID).Scan(&senderID, &receiverID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("friend request not found")
		}
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO friends (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, senderID, receiverID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO friends (user_id,friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, receiverID, senderID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *pgFriendRepo) RejectRequest(ctx context.Context, requestID, userID string) error {
	ct, err := r.pool.Exec(ctx, `UPDATE friend_requests SET status='rejected', responded_at=now()
		WHERE id=$1 AND receiver_id=$2 AND status='pending'`, requestID, userID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("friend request not found")
	}
	return nil
}

func (r *pgFriendRepo) ListFriends(ctx context.Context, userID string) ([]domain.User, error) {
	rows, err := r.pool.Query(ctx, `SELECT u.id,u.email,u.full_name,u.username,u.phone,u.avatar_url,u.google_sub,COALESCE(u.password_hash,''),COALESCE(u.secret_answer_hash,''),u.created_at,u.updated_at
		FROM friends f JOIN users u ON u.id=f.friend_id
		WHERE f.user_id=$1 ORDER BY u.full_name ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.User{}
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Username, &u.Phone, &u.AvatarURL, &u.GoogleSub, &u.PasswordHash, &u.SecretAnswerHash, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *pgFriendRepo) ListFriendshipsCreatedAsc(ctx context.Context, userID string) ([]time.Time, error) {
	rows, err := r.pool.Query(ctx, `SELECT created_at FROM friends WHERE user_id=$1 ORDER BY created_at ASC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []time.Time
	for rows.Next() {
		var t time.Time
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (r *pgFriendRepo) ListUsersWithStatus(ctx context.Context, userID string) ([]domain.FriendUser, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
		  u.id,
		  u.email,
		  u.full_name,
		  u.username,
		  CASE
		    WHEN f.user_id IS NOT NULL THEN 'friends'
		    WHEN incoming.id IS NOT NULL THEN 'incoming'
		    WHEN outgoing.id IS NOT NULL THEN 'outgoing'
		    ELSE 'none'
		  END AS friendship_status
		FROM users u
		LEFT JOIN friends f ON f.user_id=$1 AND f.friend_id=u.id
		LEFT JOIN friend_requests incoming ON incoming.sender_id=u.id AND incoming.receiver_id=$1 AND incoming.status='pending'
		LEFT JOIN friend_requests outgoing ON outgoing.sender_id=$1 AND outgoing.receiver_id=u.id AND outgoing.status='pending'
		WHERE u.id <> $1
		ORDER BY u.full_name ASC, u.email ASC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.FriendUser{}
	for rows.Next() {
		var fu domain.FriendUser
		if err := rows.Scan(&fu.ID, &fu.Email, &fu.FullName, &fu.Username, &fu.FriendshipStatus); err != nil {
			return nil, err
		}
		out = append(out, fu)
	}
	return out, rows.Err()
}

func (r *pgFriendRepo) ListWeeklyLeaderboard(ctx context.Context, userID string, from, to time.Time) ([]domain.FriendLeaderboardEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
		  u.id,
		  u.full_name,
		  u.username,
		  COALESCE(SUM(s.duration_min),0) AS weekly_minutes
		FROM users u
		LEFT JOIN friends f ON f.user_id=$1 AND f.friend_id=u.id
		LEFT JOIN sessions s ON s.user_id=u.id AND s.started_at >= $2 AND s.started_at < $3
		WHERE u.id=$1 OR f.user_id IS NOT NULL
		GROUP BY u.id,u.full_name,u.username
		ORDER BY weekly_minutes DESC, u.full_name ASC
	`, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []domain.FriendLeaderboardEntry{}
	for rows.Next() {
		var e domain.FriendLeaderboardEntry
		if err := rows.Scan(&e.UserID, &e.FullName, &e.Username, &e.WeeklyMinutes); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r *pgAuthRepo) SaveRefreshToken(ctx context.Context, t domain.RefreshToken) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at) VALUES ($1,$2,$3,$4)`, t.ID, t.UserID, t.TokenHash, t.ExpiresAt)
	return err
}
func (r *pgAuthRepo) GetRefreshToken(ctx context.Context, id string) (domain.RefreshToken, error) {
	var t domain.RefreshToken
	err := r.pool.QueryRow(ctx, `SELECT id,user_id,token_hash,expires_at,revoked_at FROM refresh_tokens WHERE id=$1`, id).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.RevokedAt)
	return t, err
}
func (r *pgAuthRepo) RevokeRefreshToken(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1`, id)
	return err
}
