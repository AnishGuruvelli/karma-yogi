package controller

import (
	"net/http"

	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/middleware"
	"github.com/karma-yogi/backend/internal/service"
)

type AchievementHandler struct{ svc *service.AchievementService }

func (h *AchievementHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	items, err := h.svc.ListMine(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"achievements": items})
}
