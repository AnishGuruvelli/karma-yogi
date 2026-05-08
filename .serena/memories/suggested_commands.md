# Suggested Commands

## Frontend (`cd frontend`)
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | TypeScript type-check (run after every change) |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run android:build:sync` | Build + sync to Android |
| `npx cap open android` | Open Android Studio |

## Backend (`cd backend`)
| Command | Purpose |
|---------|---------|
| `make run` | Run API server (`go run ./cmd/api`) |
| `make test` | Run all Go tests (`go test ./...`) |
| `make lint` | `go vet ./...` |
| `make build` | Compile binary |
| `make migrate-up` | Apply SQL migrations |
| `make migrate-down` | Roll back last migration |

## Validation after every task
```bash
# Frontend
cd frontend && npx tsc --noEmit

# Backend
cd backend && go test ./...
```
