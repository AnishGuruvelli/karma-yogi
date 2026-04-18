package auth

import "testing"

func TestTokenManagerRoundTrip(t *testing.T) {
	tm := NewTokenManager("test-secret", 15, 24)
	tok, err := tm.GenerateAccessToken("u1", "u@test.com")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := tm.ParseAccessToken(tok)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "u1" {
		t.Fatalf("expected user id u1, got %s", claims.UserID)
	}
}
