package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func RateLimitPerIP(max int, window time.Duration) func(http.Handler) http.Handler {
	type counter struct {
		count int
		reset time.Time
	}
	var (
		mu       sync.Mutex
		counters = map[string]counter{}
	)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			ip := extractClientIP(r.RemoteAddr)
			platform := NormalizeClientPlatform(r.Header.Get("X-Client-Platform"))
			key := platform + "|" + ip
			now := time.Now()
			mu.Lock()
			entry := counters[key]
			if now.After(entry.reset) {
				entry = counter{count: 0, reset: now.Add(window)}
			}
			entry.count++
			counters[key] = entry
			mu.Unlock()
			if entry.count > max {
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func extractClientIP(remoteAddr string) string {
	ip, _, _ := net.SplitHostPort(remoteAddr)
	if strings.TrimSpace(ip) == "" {
		return remoteAddr
	}
	return ip
}
