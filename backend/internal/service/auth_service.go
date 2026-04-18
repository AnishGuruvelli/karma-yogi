package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	// ErrPasswordResetInvalidCreds is returned for wrong secret answers (and intentionally also for unknown emails)
	// so we do not leak whether an email exists in the system.
	ErrPasswordResetInvalidCreds = errors.New("incorrect email or security answer")
	// ErrPasswordResetGoogleOnly indicates the account was created via Google OAuth and has no email/password credentials.
	ErrPasswordResetGoogleOnly = errors.New("this account uses google sign-in; password reset is not available")
	// ErrPasswordResetMissingSecret indicates legacy password accounts created before secret answers were required.
	ErrPasswordResetMissingSecret = errors.New("this account does not have a security answer on file; create a new account or contact support")
)

type AuthService struct {
	users    database.UserRepository
	authRepo database.AuthRepository
	tokens   *auth.TokenManager
	google   *auth.GoogleVerifier
}

type AuthResult struct {
	User         domain.User `json:"user"`
	AccessToken  string      `json:"accessToken"`
	RefreshID    string      `json:"refreshId"`
	RefreshToken string      `json:"refreshToken"`
}

func NewAuthService(users database.UserRepository, authRepo database.AuthRepository, tokens *auth.TokenManager, google *auth.GoogleVerifier) *AuthService {
	return &AuthService{users: users, authRepo: authRepo, tokens: tokens, google: google}
}

func (s *AuthService) GoogleLogin(ctx context.Context, googleToken string) (AuthResult, error) {
	idn, err := s.google.VerifyIDToken(ctx, googleToken)
	if err != nil {
		return AuthResult{}, err
	}
	if idn.Email == "" {
		return AuthResult{}, errors.New("google payload missing email")
	}
	user, err := s.users.UpsertGoogleUser(ctx, strings.ToLower(idn.Email), idn.Name, idn.Picture, idn.Subject)
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return AuthResult{}, err
	}
	rid, raw, hash, exp, err := s.tokens.GenerateRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.authRepo.SaveRefreshToken(ctx, domain.RefreshToken{ID: rid, UserID: user.ID, TokenHash: hash, ExpiresAt: exp}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, AccessToken: access, RefreshID: rid, RefreshToken: raw}, nil
}

func (s *AuthService) DevLogin(ctx context.Context, email string) (AuthResult, error) {
	if strings.TrimSpace(email) == "" {
		email = "dev@karmayogi.local"
	}
	user, err := s.users.UpsertGoogleUser(ctx, strings.ToLower(email), "Dev User", "", "dev-local-sub")
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return AuthResult{}, err
	}
	rid, raw, hash, exp, err := s.tokens.GenerateRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.authRepo.SaveRefreshToken(ctx, domain.RefreshToken{ID: rid, UserID: user.ID, TokenHash: hash, ExpiresAt: exp}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, AccessToken: access, RefreshID: rid, RefreshToken: raw}, nil
}

func (s *AuthService) RegisterWithPassword(ctx context.Context, email, fullName, password, secretAnswer string) (AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	fullName = strings.TrimSpace(fullName)
	secretAnswer = auth.NormalizeSecretAnswer(secretAnswer)
	if email == "" || password == "" {
		return AuthResult{}, errors.New("email and password are required")
	}
	if len(password) < 8 {
		return AuthResult{}, errors.New("password must be at least 8 characters")
	}
	if len(secretAnswer) < 2 {
		return AuthResult{}, errors.New("secret answer must be at least 2 characters")
	}
	if fullName == "" {
		fullName = strings.Split(email, "@")[0]
	}
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResult{}, err
	}
	secretHashBytes, err := bcrypt.GenerateFromPassword([]byte(secretAnswer), bcrypt.DefaultCost)
	if err != nil {
		return AuthResult{}, err
	}
	user, err := s.users.CreateWithPassword(ctx, email, fullName, string(hashBytes), string(secretHashBytes))
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return AuthResult{}, err
	}
	rid, raw, hash, exp, err := s.tokens.GenerateRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.authRepo.SaveRefreshToken(ctx, domain.RefreshToken{ID: rid, UserID: user.ID, TokenHash: hash, ExpiresAt: exp}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, AccessToken: access, RefreshID: rid, RefreshToken: raw}, nil
}

func (s *AuthService) LoginWithPassword(ctx context.Context, email, password string) (AuthResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || password == "" {
		return AuthResult{}, errors.New("email and password are required")
	}
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, database.ErrUserNotFound) {
			return AuthResult{}, errors.New("invalid email or password")
		}
		return AuthResult{}, err
	}
	if strings.TrimSpace(user.PasswordHash) == "" {
		return AuthResult{}, errors.New("password login not enabled for this account")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return AuthResult{}, errors.New("invalid email or password")
	}
	access, err := s.tokens.GenerateAccessToken(user.ID, user.Email)
	if err != nil {
		return AuthResult{}, err
	}
	rid, raw, hash, exp, err := s.tokens.GenerateRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.authRepo.SaveRefreshToken(ctx, domain.RefreshToken{ID: rid, UserID: user.ID, TokenHash: hash, ExpiresAt: exp}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: user, AccessToken: access, RefreshID: rid, RefreshToken: raw}, nil
}

func (s *AuthService) ResetPasswordWithSecret(ctx context.Context, email, secretAnswer, newPassword string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	secretAnswer = auth.NormalizeSecretAnswer(secretAnswer)
	if email == "" || secretAnswer == "" || newPassword == "" {
		return errors.New("email, secret answer, and new password are required")
	}
	if len(newPassword) < 8 {
		return errors.New("new password must be at least 8 characters")
	}
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, database.ErrUserNotFound) {
			return ErrPasswordResetInvalidCreds
		}
		return errors.New("unable to reset password")
	}
	if strings.TrimSpace(user.PasswordHash) == "" {
		if strings.TrimSpace(user.GoogleSub) != "" {
			return ErrPasswordResetGoogleOnly
		}
		return errors.New("unable to reset password")
	}
	if strings.TrimSpace(user.SecretAnswerHash) == "" {
		return ErrPasswordResetMissingSecret
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.SecretAnswerHash), []byte(secretAnswer)); err != nil {
		return ErrPasswordResetInvalidCreds
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := s.users.UpdatePasswordHash(ctx, user.ID, string(newHash)); err != nil {
		return errors.New("unable to reset password")
	}
	return nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshID, rawToken string) (AuthResult, error) {
	t, err := s.authRepo.GetRefreshToken(ctx, refreshID)
	if err != nil {
		return AuthResult{}, err
	}
	if t.RevokedAt != nil || t.ExpiresAt.Before(time.Now()) {
		return AuthResult{}, errors.New("refresh token expired or revoked")
	}
	if auth.HashToken(rawToken) != t.TokenHash {
		return AuthResult{}, errors.New("refresh token mismatch")
	}
	if err := s.authRepo.RevokeRefreshToken(ctx, refreshID); err != nil {
		return AuthResult{}, err
	}
	u, err := s.users.GetByID(ctx, t.UserID)
	if err != nil {
		return AuthResult{}, err
	}
	access, err := s.tokens.GenerateAccessToken(u.ID, u.Email)
	if err != nil {
		return AuthResult{}, err
	}
	rid, raw, hash, exp, err := s.tokens.GenerateRefreshToken()
	if err != nil {
		return AuthResult{}, err
	}
	if err := s.authRepo.SaveRefreshToken(ctx, domain.RefreshToken{ID: rid, UserID: u.ID, TokenHash: hash, ExpiresAt: exp}); err != nil {
		return AuthResult{}, err
	}
	return AuthResult{User: u, AccessToken: access, RefreshID: rid, RefreshToken: raw}, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshID string) error {
	return s.authRepo.RevokeRefreshToken(ctx, refreshID)
}
