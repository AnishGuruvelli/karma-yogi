FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN go mod tidy && go build -o /bin/api ./cmd/api

FROM alpine:3.20
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /bin/api /app/api
COPY --from=build /app/migrations /app/migrations
EXPOSE 8080
USER app
CMD ["/app/api"]
