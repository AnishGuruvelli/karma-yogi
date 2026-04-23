package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/config"
	"github.com/karma-yogi/backend/internal/controller"
	"github.com/karma-yogi/backend/internal/database"
	httpx "github.com/karma-yogi/backend/internal/http"
	"github.com/karma-yogi/backend/internal/service"
)

func main() {
	_ = godotenv.Load("../.env", ".env")
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	ctx := context.Background()
	dsn := cfg.PostgresDSN()
	var pool *pgxpool.Pool
	for attempt := 1; attempt <= 15; attempt++ {
		var err error
		pool, err = database.NewPool(ctx, dsn)
		if err == nil {
			break
		}
		if attempt == 15 {
			log.Fatalf("database: %v", err)
		}
		log.Printf("database unavailable (attempt %d/15), retrying: %v", attempt, err)
		time.Sleep(time.Second)
	}
	defer pool.Close()
	if err := runMigrations(ctx, pool); err != nil {
		log.Fatal(err)
	}

	repos := database.NewRepositories(pool)
	tm := auth.NewTokenManager(cfg.Auth.JWTSecret, cfg.Auth.AccessTTLMinutes, cfg.Auth.RefreshTTLHours)
	gv := auth.NewGoogleVerifier(cfg.Auth.GoogleClientID)

	authSvc := service.NewAuthService(repos.Users, repos.Auth, tm, gv)
	userSvc := service.NewUserService(repos.Users)
	subjectSvc := service.NewSubjectService(repos.Subjects)
	sessSvc := service.NewSessionService(repos.Sessions)
	goalSvc := service.NewGoalService(repos.Goals)
	insSvc := service.NewInsightsService(repos.Sessions, repos.Goals)
	timerSvc := service.NewTimerStateService(repos.Timer)
	friendSvc := service.NewFriendService(repos.Friends, repos.Subjects, repos.Sessions)

	h := controller.NewHandlers(authSvc, userSvc, subjectSvc, sessSvc, goalSvc, insSvc, timerSvc, friendSvc)
	router := httpx.NewRouter(h, tm, cfg.CORSAllowedOrigins)

	srv := &http.Server{Addr: ":" + cfg.API.Port, Handler: router, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		log.Printf("api listening on :%s", cfg.API.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctxShutdown)
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	files, err := filepath.Glob("migrations/*.up.sql")
	if err != nil {
		return fmt.Errorf("loading migrations: %w", err)
	}
	for _, file := range files {
		sqlBytes, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}
		statements := strings.Split(string(sqlBytes), ";")
		for _, stmt := range statements {
			query := strings.TrimSpace(stmt)
			if query == "" {
				continue
			}
			if _, err := pool.Exec(ctx, query); err != nil {
				return fmt.Errorf("apply migration %s: %w", file, err)
			}
		}
	}
	return nil
}
