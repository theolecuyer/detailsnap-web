package middleware

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func StructuredLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				claims := GetClaims(r)
				attrs := []slog.Attr{
					slog.String("request_id", middleware.GetReqID(r.Context())),
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
					slog.Int("status", ww.Status()),
					slog.Int64("duration_ms", time.Since(start).Milliseconds()),
				}
				if claims != nil {
					attrs = append(attrs,
						slog.String("user_id", claims.UserID),
						slog.String("shop_id", claims.ShopID),
					)
				}
				logger.LogAttrs(r.Context(), slog.LevelInfo, "request", attrs...)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}

func writeError(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
		"code":  code,
	})
}
