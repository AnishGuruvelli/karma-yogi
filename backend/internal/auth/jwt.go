package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenManager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenManager(secret string, accessMinutes, refreshHours int) *TokenManager {
	return &TokenManager{
		secret:     []byte(secret),
		accessTTL:  time.Duration(accessMinutes) * time.Minute,
		refreshTTL: time.Duration(refreshHours) * time.Hour,
	}
}

type Claims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func (t *TokenManager) GenerateAccessToken(userID, email string) (string, error) {
	claims := Claims{UserID: userID, Email: email, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(t.accessTTL)), Subject: userID, IssuedAt: jwt.NewNumericDate(time.Now())}}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(t.secret)
}

func (t *TokenManager) GenerateRefreshToken() (id string, token string, hash string, expiresAt time.Time, err error) {
	id = uuid.NewString()
	raw := uuid.NewString() + "." + uuid.NewString()
	expiresAt = time.Now().Add(t.refreshTTL)
	h := sha256.Sum256([]byte(raw))
	return id, raw, hex.EncodeToString(h[:]), expiresAt, nil
}

func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (t *TokenManager) ParseAccessToken(accessToken string) (*Claims, error) {
	claims := &Claims{}
	tkn, err := jwt.ParseWithClaims(accessToken, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return t.secret, nil
	})
	if err != nil || !tkn.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
