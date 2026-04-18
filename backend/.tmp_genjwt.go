package main

import (
  "fmt"
  "os"
  "time"
  "github.com/golang-jwt/jwt/v5"
)

func main() {
  secret := os.Getenv("JWT_SECRET")
  claims := jwt.MapClaims{
    "userId": "11111111-1111-1111-1111-111111111111",
    "email": "e2e@example.com",
    "sub": "11111111-1111-1111-1111-111111111111",
    "iat": time.Now().Unix(),
    "exp": time.Now().Add(15 * time.Minute).Unix(),
  }
  tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
  out, err := tok.SignedString([]byte(secret))
  if err != nil { panic(err) }
  fmt.Println(out)
}
