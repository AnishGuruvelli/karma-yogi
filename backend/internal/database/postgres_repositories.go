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
	Users    UserRepository
	Subjects SubjectRepository
	Sessions SessionRepository
	Goals    GoalRepository
	Timer    TimerStateRepository
	Auth     AuthRepository
}

func NewRepositories(pool *pgxpool.Pool) Repositories {
	return Repositories{
		Users:    &pgUserRepo{pool: pool},
		Subjects: &pgSubjectRepo{pool: pool},
		Sessions: &pgSessionRepo{pool: pool},
		Goals:    &pgGoalRepo{pool: pool},
		Timer:    &pgTimerStateRepo{pool: pool},
		Auth:     &pgAuthRepo{pool: pool},
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
	return u, err
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

type pgAuthRepo struct{ pool *pgxpool.Pool }

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
