package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	API struct {
		Port string
	}
	DatabaseURL string
	Postgres struct {
		Host     string
		Port     string
		DB       string
		User     string
		Password string
		SSLMode  string
	}
	Auth struct {
		JWTSecret          string
		AccessTTLMinutes   int
		RefreshTTLHours    int
		GoogleClientID     string
		GoogleClientSecret string
		GoogleRedirectURL  string
	}
	CORSAllowedOrigins []string
}

func Load() (Config, error) {
	cfg := Config{}
	cfg.API.Port = getEnv("API_PORT", "8080")
	cfg.DatabaseURL = getEnv("DATABASE_URL", "")
	cfg.Postgres.Host = getEnv("POSTGRES_HOST", "localhost")
	cfg.Postgres.Port = getEnv("POSTGRES_PORT", "5432")
	cfg.Postgres.DB = getEnv("POSTGRES_DB", "karma_yogi")
	cfg.Postgres.User = getEnv("POSTGRES_USER", "karma")
	cfg.Postgres.Password = getEnv("POSTGRES_PASSWORD", "karma")
	cfg.Postgres.SSLMode = getEnv("POSTGRES_SSLMODE", "disable")
	cfg.Auth.JWTSecret = getEnv("JWT_SECRET", "dev-secret")
	cfg.Auth.GoogleClientID = getEnv("GOOGLE_CLIENT_ID", "")
	cfg.Auth.GoogleClientSecret = getEnv("GOOGLE_CLIENT_SECRET", "")
	cfg.Auth.GoogleRedirectURL = getEnv("GOOGLE_REDIRECT_URL", "")
	cfg.Auth.AccessTTLMinutes = getEnvInt("JWT_ACCESS_TTL_MINUTES", 15)
	cfg.Auth.RefreshTTLHours = getEnvInt("JWT_REFRESH_TTL_HOURS", 720)
	cfg.CORSAllowedOrigins = strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:8081"), ",")

	if cfg.Auth.JWTSecret == "" {
		return cfg, fmt.Errorf("JWT_SECRET is required")
	}
	return cfg, nil
}

func (c Config) PostgresDSN() string {
	// Prefer full DATABASE_URL when provided (useful for managed DBs like Neon/Render).
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", c.Postgres.User, c.Postgres.Password, c.Postgres.Host, c.Postgres.Port, c.Postgres.DB, c.Postgres.SSLMode)
}

func getEnv(key, def string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return def
}

func getEnvInt(key string, def int) int {
	val := getEnv(key, "")
	if val == "" {
		return def
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return def
	}
	return n
}
