package auth

import (
	"context"
	"fmt"

	"google.golang.org/api/idtoken"
)

type GoogleIdentity struct {
	Email   string
	Name    string
	Picture string
	Subject string
}

type GoogleVerifier struct {
	clientID string
}

func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{clientID: clientID}
}

func (g *GoogleVerifier) VerifyIDToken(ctx context.Context, token string) (GoogleIdentity, error) {
	payload, err := idtoken.Validate(ctx, token, g.clientID)
	if err != nil {
		return GoogleIdentity{}, fmt.Errorf("google token validation failed: %w", err)
	}
	identity := GoogleIdentity{Subject: payload.Subject}
	if v, ok := payload.Claims["email"].(string); ok {
		identity.Email = v
	}
	if v, ok := payload.Claims["name"].(string); ok {
		identity.Name = v
	}
	if v, ok := payload.Claims["picture"].(string); ok {
		identity.Picture = v
	}
	return identity, nil
}
