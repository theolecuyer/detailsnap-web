package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/detailsnap/auth-service/internal/db"
	"github.com/detailsnap/auth-service/internal/handlers"
	"github.com/detailsnap/auth-service/internal/middleware"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := loadConfig()

	database, err := db.New(cfg.DSN())
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(middleware.StructuredLogger(logger))
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.CORSOrigin},
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	h := handlers.New(database, cfg.JWTSecret, cfg.JWTTTLHours)
	authMW := middleware.JWTAuth(cfg.JWTSecret)
	ownerMW := middleware.RequireOwner

	// Health endpoints
	r.Get("/healthz", handlers.Healthz)
	r.Get("/readyz", handlers.Readyz(database))

	// Public endpoints
	r.Post("/signup", h.Signup)
	r.Post("/login", h.Login)
	r.Post("/invites/accept", h.AcceptInvite)

	// Authenticated endpoints
	r.Group(func(r chi.Router) {
		r.Use(authMW)
		r.Get("/me", h.Me)
		r.Get("/shop", h.GetShop)
		r.Patch("/shop", ownerMW(h.UpdateShop))
		r.Get("/staff", h.ListStaff)
		r.Post("/staff/invites", ownerMW(h.CreateInvite))
		r.Get("/staff/invites", ownerMW(h.ListInvites))
		r.Delete("/staff/invites/{id}", ownerMW(h.RevokeInvite))
		r.Delete("/staff/{userId}", ownerMW(h.RemoveStaff))
	})

	addr := fmt.Sprintf(":%d", cfg.Port)
	slog.Info("auth-service starting", "addr", addr)

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}

type config struct {
	Port        int
	DBHost      string
	DBPort      int
	DBUser      string
	DBPassword  string
	DBName      string
	JWTSecret   string
	JWTTTLHours int
	CORSOrigin  string
}

func (c config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&charset=utf8mb4",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func loadConfig() config {
	return config{
		Port:        envInt("PORT", 8081),
		DBHost:      envStr("DB_HOST", "localhost"),
		DBPort:      envInt("DB_PORT", 3306),
		DBUser:      envStr("DB_USER", "detailsnap"),
		DBPassword:  envStr("DB_PASSWORD", "changeme"),
		DBName:      envStr("DB_NAME", "detailsnap"),
		JWTSecret:   envStr("JWT_SECRET", "change-me-in-production"),
		JWTTTLHours: envInt("JWT_TTL_HOURS", 24),
		CORSOrigin:  envStr("CORS_ORIGIN", "http://localhost:5173"),
	}
}

func envStr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

// suppress unused import warning for context
var _ = context.Background
