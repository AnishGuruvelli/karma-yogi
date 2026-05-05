package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/karma-yogi/backend/internal/controller"
)

func TestCORSPreflightAllowsPut(t *testing.T) {
	router := NewRouter(controller.Handlers{}, nil, []string{"http://localhost:8081"})

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/timer-state", nil)
	req.Header.Set("Origin", "http://localhost:8081")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, rec.Code)
	}

	allowMethods := rec.Header().Get("Access-Control-Allow-Methods")
	if allowMethods == "" {
		t.Fatal("expected Access-Control-Allow-Methods header to be set")
	}
	if !strings.Contains(allowMethods, "PUT") {
		t.Fatalf("expected Access-Control-Allow-Methods to include PUT, got %q", allowMethods)
	}
}
