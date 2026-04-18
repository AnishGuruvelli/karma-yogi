package controller

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/domain"
	"github.com/karma-yogi/backend/internal/middleware"
	"github.com/karma-yogi/backend/internal/service"
)

type Handlers struct {
	Auth     *AuthHandler
	Users    *UserHandler
	Subjects *SubjectHandler
	Sessions *SessionHandler
	Goals    *GoalHandler
	Insights *InsightsHandler
}

func NewHandlers(a *service.AuthService, u *service.UserService, sub *service.SubjectService, s *service.SessionService, g *service.GoalService, i *service.InsightsService) Handlers {
	return Handlers{Auth: &AuthHandler{svc: a}, Users: &UserHandler{svc: u}, Subjects: &SubjectHandler{svc: sub}, Sessions: &SessionHandler{svc: s}, Goals: &GoalHandler{svc: g}, Insights: &InsightsHandler{svc: i}}
}

type AuthHandler struct{ svc *service.AuthService }

func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.svc.GoogleLogin(r.Context(), req.Token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, res)
}
func (h *AuthHandler) DevLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	res, err := h.svc.DevLogin(r.Context(), req.Email)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, res)
}
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshID    string `json:"refreshId"`
		RefreshToken string `json:"refreshToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.svc.Refresh(r.Context(), req.RefreshID, req.RefreshToken)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	writeJSON(w, http.StatusOK, res)
}
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshID string `json:"refreshId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.Logout(r.Context(), req.RefreshID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type UserHandler struct{ svc *service.UserService }

func (h *UserHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	u, err := h.svc.Me(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, u)
}
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		FullName  string `json:"fullName"`
		Username  string `json:"username"`
		Phone     string `json:"phone"`
		AvatarURL string `json:"avatarUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	u, err := h.svc.Update(r.Context(), claims.UserID, req.FullName, req.Username, req.Phone, req.AvatarURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, u)
}

type SessionHandler struct{ svc *service.SessionService }

func (h *SessionHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		SubjectID   string    `json:"subjectId"`
		Topic       string    `json:"topic"`
		DurationMin int       `json:"durationMin"`
		Mood        string    `json:"mood"`
		StartedAt   time.Time `json:"startedAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s, err := h.svc.Create(r.Context(), claims.UserID, req.SubjectID, req.Topic, req.Mood, req.DurationMin, req.StartedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, s)
}
func (h *SessionHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	items, err := h.svc.List(r.Context(), claims.UserID, nil, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, items)
}
func (h *SessionHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	id := chi.URLParam(r, "id")
	var req struct {
		Topic       string    `json:"topic"`
		DurationMin int       `json:"durationMin"`
		Mood        string    `json:"mood"`
		StartedAt   time.Time `json:"startedAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s, err := h.svc.Update(r.Context(), claims.UserID, id, req.Topic, req.Mood, req.DurationMin, req.StartedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, s)
}
func (h *SessionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type GoalHandler struct{ svc *service.GoalService }

type SubjectHandler struct{ svc *service.SubjectService }

func (h *SubjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	sub, err := h.svc.Create(r.Context(), claims.UserID, req.Name, req.Color)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}
func (h *SubjectHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	subs, err := h.svc.List(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, subs)
}
func (h *SubjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		Title         string    `json:"title"`
		TargetMinutes int       `json:"targetMinutes"`
		Deadline      time.Time `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	g, err := h.svc.Create(r.Context(), claims.UserID, req.Title, req.TargetMinutes, req.Deadline)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, g)
}
func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	goals, err := h.svc.List(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, goals)
}
func (h *GoalHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		Title         string    `json:"title"`
		TargetMinutes int       `json:"targetMinutes"`
		Deadline      time.Time `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	g, err := h.svc.Update(r.Context(), domain.Goal{ID: chi.URLParam(r, "id"), UserID: claims.UserID, Title: req.Title, TargetMinutes: req.TargetMinutes, Deadline: req.Deadline})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, g)
}
func (h *GoalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.Delete(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type InsightsHandler struct{ svc *service.InsightsService }

func (h *InsightsHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	ins, err := h.svc.Get(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, ins)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
