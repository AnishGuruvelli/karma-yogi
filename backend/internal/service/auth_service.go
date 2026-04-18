package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/database"
	"github.com/karma-yogi/backend/internal/domain"
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
