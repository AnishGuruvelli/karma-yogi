package controller

import (
	"net/http"

	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/middleware"
	"github.com/karma-yogi/backend/internal/service"
)

type StudyStatsHandler struct{ svc *service.StudyStatsService }

func (h *StudyStatsHandler) GetMine(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	tz := r.URL.Query().Get("tz")
	if tz == "" {
		tz = "UTC"
	}
	out, err := h.svc.Summary(r.Context(), claims.UserID, tz)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, out)
}
