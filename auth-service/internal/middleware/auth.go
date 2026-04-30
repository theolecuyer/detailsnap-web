package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/detailsnap/auth-service/internal/models"
)

type contextKey string

const ClaimsKey contextKey = "claims"

func JWTAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				writeError(w, http.StatusUnauthorized, "missing or invalid authorization header", "UNAUTHORIZED")
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				writeError(w, http.StatusUnauthorized, "invalid or expired token", "UNAUTHORIZED")
				return
			}

			mapClaims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				writeError(w, http.StatusUnauthorized, "invalid token claims", "UNAUTHORIZED")
				return
			}

			claims := &models.Claims{
				UserID: mapClaims["user_id"].(string),
				ShopID: mapClaims["shop_id"].(string),
				Role:   mapClaims["role"].(string),
			}

			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireOwner(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(ClaimsKey).(*models.Claims)
		if !ok || claims.Role != "owner" {
			writeError(w, http.StatusForbidden, "owner role required", "FORBIDDEN")
			return
		}
		next(w, r)
	}
}

func GetClaims(r *http.Request) *models.Claims {
	c, _ := r.Context().Value(ClaimsKey).(*models.Claims)
	return c
}
