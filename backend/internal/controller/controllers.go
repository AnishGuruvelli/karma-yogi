package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
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
	Timer    *TimerStateHandler
	Friends  *FriendHandler
}

func NewHandlers(a *service.AuthService, u *service.UserService, sub *service.SubjectService, s *service.SessionService, g *service.GoalService, i *service.InsightsService, t *service.TimerStateService, f *service.FriendService) Handlers {
	return Handlers{
		Auth:     &AuthHandler{svc: a},
		Users:    &UserHandler{svc: u},
		Subjects: &SubjectHandler{svc: sub},
		Sessions: &SessionHandler{svc: s},
		Goals:    &GoalHandler{svc: g},
		Insights: &InsightsHandler{svc: i},
		Timer:    &TimerStateHandler{svc: t},
		Friends:  &FriendHandler{svc: f},
	}
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
func (h *AuthHandler) RegisterWithPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		FullName     string `json:"fullName"`
		Password     string `json:"password"`
		SecretAnswer string `json:"secretAnswer"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.svc.RegisterWithPassword(r.Context(), req.Email, req.FullName, req.Password, req.SecretAnswer)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, res)
}

func (h *AuthHandler) ResetPasswordWithSecret(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string `json:"email"`
		SecretAnswer string `json:"secretAnswer"`
		NewPassword  string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := h.svc.ResetPasswordWithSecret(r.Context(), req.Email, req.SecretAnswer, req.NewPassword); err != nil {
		switch {
		case errors.Is(err, service.ErrPasswordResetInvalidCreds):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		case errors.Is(err, service.ErrPasswordResetGoogleOnly):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		case errors.Is(err, service.ErrPasswordResetMissingSecret):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		default:
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "unable to reset password"})
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
func (h *AuthHandler) LoginWithPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	res, err := h.svc.LoginWithPassword(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
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
	s, err := h.svc.Update(r.Context(), claims.UserID, id, req.SubjectID, req.Topic, req.Mood, req.DurationMin, req.StartedAt)
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
type TimerStateHandler struct{ svc *service.TimerStateService }
type FriendHandler struct{ svc *service.FriendService }

func (h *InsightsHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	ins, err := h.svc.Get(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, ins)
}

func (h *TimerStateHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	state, err := h.svc.Get(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if state == nil {
		writeJSON(w, http.StatusOK, map[string]any{"state": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"state": state})
}

func (h *TimerStateHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		State map[string]any `json:"state"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.State == nil {
		http.Error(w, "state is required", http.StatusBadRequest)
		return
	}
	if err := h.svc.Upsert(r.Context(), claims.UserID, req.State); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *TimerStateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.Delete(r.Context(), claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *FriendHandler) Users(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	users, err := h.svc.Users(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *FriendHandler) ListFriends(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	users, err := h.svc.ListFriends(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *FriendHandler) IncomingRequests(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	reqs, err := h.svc.IncomingRequests(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, reqs)
}

func (h *FriendHandler) OutgoingRequests(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	reqs, err := h.svc.OutgoingRequests(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, reqs)
}

func (h *FriendHandler) SendRequest(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		ReceiverID string `json:"receiverId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.SendRequest(r.Context(), claims.UserID, req.ReceiverID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *FriendHandler) AcceptRequest(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.AcceptRequest(r.Context(), chi.URLParam(r, "id"), claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *FriendHandler) RejectRequest(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.RejectRequest(r.Context(), chi.URLParam(r, "id"), claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *FriendHandler) WeeklyLeaderboard(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	weekOffset := 0
	if raw := r.URL.Query().Get("weekOffset"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			http.Error(w, "invalid weekOffset", http.StatusBadRequest)
			return
		}
		weekOffset = parsed
	}
	rows, err := h.svc.WeeklyLeaderboard(r.Context(), claims.UserID, weekOffset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (h *FriendHandler) CreateFriendSession(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req struct {
		FriendIDs   []string  `json:"friendIds"`
		SubjectName string    `json:"subjectName"`
		Topic       string    `json:"topic"`
		DurationMin int       `json:"durationMin"`
		Mood        string    `json:"mood"`
		StartedAt   time.Time `json:"startedAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.CreateFriendSession(r.Context(), claims.UserID, req.FriendIDs, req.SubjectName, req.Topic, req.Mood, req.DurationMin, req.StartedAt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *TimerStateHandler) Start(w http.ResponseWriter, r *http.Request) {
	startedAt := time.Now().UTC()
	writeJSON(w, http.StatusOK, map[string]any{
		"startedAt":   startedAt.Format(time.RFC3339Nano),
		"startedAtMs": startedAt.UnixMilli(),
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
