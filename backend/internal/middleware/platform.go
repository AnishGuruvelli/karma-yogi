package middleware

import (
	"context"
	"net/http"
	"strings"
)

type clientMetaCtxKey string

const (
	clientMetaContextKey  clientMetaCtxKey = "client-meta"
	defaultClientPlatform                  = "web"
)

type ClientMeta struct {
	Platform   string
	AppVersion string
}

func ClientMetaMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		meta := ClientMeta{
			Platform:   NormalizeClientPlatform(r.Header.Get("X-Client-Platform")),
			AppVersion: strings.TrimSpace(r.Header.Get("X-App-Version")),
		}
		ctx := context.WithValue(r.Context(), clientMetaContextKey, meta)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetClientMeta(r *http.Request) ClientMeta {
	meta, ok := r.Context().Value(clientMetaContextKey).(ClientMeta)
	if !ok {
		return ClientMeta{Platform: defaultClientPlatform}
	}
	if meta.Platform == "" {
		meta.Platform = defaultClientPlatform
	}
	return meta
}

func NormalizeClientPlatform(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "android":
		return "android"
	case "ios":
		return "ios"
	default:
		return defaultClientPlatform
	}
}
