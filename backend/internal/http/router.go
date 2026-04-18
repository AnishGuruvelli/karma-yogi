package httpx

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/controller"
	"github.com/karma-yogi/backend/internal/middleware"
)

func NewRouter(h controller.Handlers, tm *auth.TokenManager, corsAllowed []string) http.Handler {
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.RateLimitPerIP(180, time.Minute))
	r.Use(simpleCORS(corsAllowed))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/auth/google", h.Auth.GoogleLogin)
		api.Post("/auth/register", h.Auth.RegisterWithPassword)
		api.Post("/auth/login", h.Auth.LoginWithPassword)
		api.Post("/auth/password-reset", h.Auth.ResetPasswordWithSecret)
		api.Post("/auth/dev-login", h.Auth.DevLogin)
		api.Post("/auth/refresh", h.Auth.Refresh)
		api.Post("/auth/logout", h.Auth.Logout)

		api.Group(func(p chi.Router) {
			p.Use(middleware.Auth(tm))
			p.Get("/users/me", h.Users.Me)
			p.Patch("/users/me", h.Users.Update)
			p.Post("/subjects", h.Subjects.Create)
			p.Get("/subjects", h.Subjects.List)
			p.Delete("/subjects/{id}", h.Subjects.Delete)
			p.Post("/sessions", h.Sessions.Create)
			p.Get("/sessions", h.Sessions.List)
			p.Patch("/sessions/{id}", h.Sessions.Update)
			p.Delete("/sessions/{id}", h.Sessions.Delete)
			p.Post("/goals", h.Goals.Create)
			p.Get("/goals", h.Goals.List)
			p.Patch("/goals/{id}", h.Goals.Update)
			p.Delete("/goals/{id}", h.Goals.Delete)
			p.Get("/insights", h.Insights.Get)
		})
	})
	return r
}

func simpleCORS(allowed []string) func(http.Handler) http.Handler {
	allowedMap := map[string]bool{}
	for _, a := range allowed {
		allowedMap[strings.TrimSpace(a)] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowedMap[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
