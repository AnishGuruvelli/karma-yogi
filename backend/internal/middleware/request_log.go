package middleware

import (
	"log"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/karma-yogi/backend/internal/auth"
)

type loggingResponseWriter struct {
	http.ResponseWriter
	status int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.status = code
	lrw.ResponseWriter.WriteHeader(code)
}

func RequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(lrw, r)

		reqID := chimiddleware.GetReqID(r.Context())
		meta := GetClientMeta(r)
		userID := "-"
		if claims, ok := r.Context().Value(UserContextKey).(*auth.Claims); ok && claims != nil && claims.UserID != "" {
			userID = claims.UserID
		}
		appVersion := meta.AppVersion
		if appVersion == "" {
			appVersion = "-"
		}

		log.Printf(
			"request method=%s path=%s status=%d duration_ms=%d request_id=%s platform=%s app_version=%s user_id=%s remote_addr=%s",
			r.Method,
			r.URL.Path,
			lrw.status,
			time.Since(start).Milliseconds(),
			reqID,
			meta.Platform,
			appVersion,
			userID,
			r.RemoteAddr,
		)
	})
}
