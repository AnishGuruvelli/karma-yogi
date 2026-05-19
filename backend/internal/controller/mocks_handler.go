package controller

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/karma-yogi/backend/internal/auth"
	"github.com/karma-yogi/backend/internal/domain"
	"github.com/karma-yogi/backend/internal/middleware"
	"github.com/karma-yogi/backend/internal/service"
)

type MocksHandler struct{ svc *service.MocksService }

func (h *MocksHandler) CreateFullMock(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req domain.FullMock
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.CreateFullMock(r.Context(), claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (h *MocksHandler) ListFullMocks(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	items, err := h.svc.ListFullMocks(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *MocksHandler) UpdateFullMock(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req domain.FullMock
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.UpdateFullMock(r.Context(), claims.UserID, chi.URLParam(r, "id"), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *MocksHandler) DeleteFullMock(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.DeleteFullMock(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *MocksHandler) CreateSectional(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req domain.SectionalTest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.CreateSectional(r.Context(), claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (h *MocksHandler) ListSectionals(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	items, err := h.svc.ListSectionals(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *MocksHandler) UpdateSectional(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req domain.SectionalTest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.UpdateSectional(r.Context(), claims.UserID, chi.URLParam(r, "id"), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *MocksHandler) DeleteSectional(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.DeleteSectional(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *MocksHandler) CreateQotdEntry(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	var req domain.QotdEntry
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	out, err := h.svc.CreateQotdEntry(r.Context(), claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (h *MocksHandler) ListQotdEntries(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	items, err := h.svc.ListQotdEntries(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *MocksHandler) DeleteQotdEntry(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*auth.Claims)
	if err := h.svc.DeleteQotdEntry(r.Context(), claims.UserID, chi.URLParam(r, "id")); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
