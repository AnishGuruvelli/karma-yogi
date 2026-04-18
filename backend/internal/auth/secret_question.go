package auth

import "strings"

// Secret answers are normalized before hashing/storing. The prompt text is owned by the client
// (`frontend/src/lib/auth-constants.ts`) and must stay in sync with product copy.

func NormalizeSecretAnswer(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
