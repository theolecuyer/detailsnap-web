package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/detailsnap/auth-service/internal/db"
	"github.com/detailsnap/auth-service/internal/middleware"
	"github.com/detailsnap/auth-service/internal/models"
)

type Handler struct {
	db          *db.DB
	jwtSecret   string
	jwtTTLHours int
}

func New(database *db.DB, jwtSecret string, jwtTTLHours int) *Handler {
	return &Handler{db: database, jwtSecret: jwtSecret, jwtTTLHours: jwtTTLHours}
}

func Healthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "auth-service",
		"version": "0.1.0",
	})
}

func Readyz(database *db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := database.PingContext(r.Context()); err != nil {
			writeError(w, http.StatusServiceUnavailable, "database unreachable", "DB_UNAVAILABLE")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

func (h *Handler) Signup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ShopName  string `json:"shopName"`
		OwnerName string `json:"ownerName"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.ShopName == "" || body.OwnerName == "" || body.Email == "" || len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "shopName, ownerName, email, and password (min 8 chars) are required", "VALIDATION_ERROR")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	shopID := uuid.NewString()
	userID := uuid.NewString()
	slug := slugify(body.ShopName)

	tx, err := h.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO shops (id, name, slug) VALUES (?, ?, ?)`,
		shopID, body.ShopName, slug)
	if err != nil {
		if isDuplicateEntry(err) {
			slug = slug + "-" + shopID[:8]
			_, err = tx.ExecContext(r.Context(),
				`INSERT INTO shops (id, name, slug) VALUES (?, ?, ?)`,
				shopID, body.ShopName, slug)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
				return
			}
		} else {
			writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
			return
		}
	}

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO users (id, shop_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, 'owner')`,
		userID, shopID, strings.ToLower(body.Email), string(hash), body.OwnerName)
	if err != nil {
		if isDuplicateEntry(err) {
			writeError(w, http.StatusConflict, "email already registered", "EMAIL_EXISTS")
		} else {
			writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		}
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	token, err := h.issueToken(userID, shopID, "owner")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":     userID,
			"shopId": shopID,
			"email":  body.Email,
			"name":   body.OwnerName,
			"role":   "owner",
		},
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Email == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password required", "VALIDATION_ERROR")
		return
	}

	var user models.User
	var hash string
	err := h.db.QueryRowContext(r.Context(),
		`SELECT id, shop_id, email, password_hash, name, role FROM users WHERE email = ?`,
		strings.ToLower(body.Email),
	).Scan(&user.ID, &user.ShopID, &user.Email, &hash, &user.Name, &user.Role)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusUnauthorized, "invalid email or password", "INVALID_CREDENTIALS")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(body.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid email or password", "INVALID_CREDENTIALS")
		return
	}

	token, err := h.issueToken(user.ID, user.ShopID, user.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":     user.ID,
			"shopId": user.ShopID,
			"email":  user.Email,
			"name":   user.Name,
			"role":   user.Role,
		},
	})
}

func (h *Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token    string `json:"token"`
		Name     string `json:"name"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Token == "" || body.Name == "" || len(body.Password) < 8 {
		writeError(w, http.StatusBadRequest, "token, name, and password (min 8 chars) required", "VALIDATION_ERROR")
		return
	}

	var invite models.StaffInvite
	err := h.db.QueryRowContext(r.Context(),
		`SELECT id, shop_id, email, token, expires_at, accepted_at FROM staff_invites WHERE token = ?`,
		body.Token,
	).Scan(&invite.ID, &invite.ShopID, &invite.Email, &invite.Token, &invite.ExpiresAt, &invite.AcceptedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "invite not found", "INVITE_NOT_FOUND")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	if invite.AcceptedAt != nil {
		writeError(w, http.StatusConflict, "invite already accepted", "INVITE_USED")
		return
	}
	if time.Now().After(invite.ExpiresAt) {
		writeError(w, http.StatusGone, "invite expired", "INVITE_EXPIRED")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	userID := uuid.NewString()
	tx, err := h.db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(r.Context(),
		`INSERT INTO users (id, shop_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, 'staff')`,
		userID, invite.ShopID, invite.Email, string(hash), body.Name)
	if err != nil {
		if isDuplicateEntry(err) {
			writeError(w, http.StatusConflict, "email already registered", "EMAIL_EXISTS")
		} else {
			writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		}
		return
	}

	_, err = tx.ExecContext(r.Context(),
		`UPDATE staff_invites SET accepted_at = NOW() WHERE id = ?`, invite.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	token, err := h.issueToken(userID, invite.ShopID, "staff")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":     userID,
			"shopId": invite.ShopID,
			"email":  invite.Email,
			"name":   body.Name,
			"role":   "staff",
		},
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	var user models.User
	err := h.db.QueryRowContext(r.Context(),
		`SELECT id, shop_id, email, name, role, created_at, updated_at FROM users WHERE id = ?`,
		claims.UserID,
	).Scan(&user.ID, &user.ShopID, &user.Email, &user.Name, &user.Role, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	var shop models.Shop
	err = h.db.QueryRowContext(r.Context(),
		`SELECT id, name, slug, address, phone, email, created_at, updated_at FROM shops WHERE id = ?`,
		claims.ShopID,
	).Scan(&shop.ID, &shop.Name, &shop.Slug, &shop.Address, &shop.Phone, &shop.Email, &shop.CreatedAt, &shop.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"user": user, "shop": shop})
}

func (h *Handler) GetShop(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	var shop models.Shop
	err := h.db.QueryRowContext(r.Context(),
		`SELECT id, name, slug, address, phone, email, created_at, updated_at FROM shops WHERE id = ?`,
		claims.ShopID,
	).Scan(&shop.ID, &shop.Name, &shop.Slug, &shop.Address, &shop.Phone, &shop.Email, &shop.CreatedAt, &shop.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	writeJSON(w, http.StatusOK, shop)
}

func (h *Handler) UpdateShop(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	var body struct {
		Name    *string `json:"name"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
		Email   *string `json:"email"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}

	_, err := h.db.ExecContext(r.Context(),
		`UPDATE shops SET
			name    = COALESCE(?, name),
			address = COALESCE(?, address),
			phone   = COALESCE(?, phone),
			email   = COALESCE(?, email)
		WHERE id = ?`,
		body.Name, body.Address, body.Phone, body.Email, claims.ShopID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	h.GetShop(w, r)
}

func (h *Handler) ListStaff(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT id, shop_id, email, name, role, created_at, updated_at FROM users WHERE shop_id = ? ORDER BY name`,
		claims.ShopID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	defer rows.Close()

	var staff []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.ShopID, &u.Email, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
			return
		}
		staff = append(staff, u)
	}
	if staff == nil {
		staff = []models.User{}
	}
	writeJSON(w, http.StatusOK, staff)
}

func (h *Handler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	var body struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Email == "" {
		writeError(w, http.StatusBadRequest, "email required", "VALIDATION_ERROR")
		return
	}

	inviteID := uuid.NewString()
	token := uuid.NewString() + uuid.NewString()
	expiresAt := time.Now().Add(72 * time.Hour)

	_, err := h.db.ExecContext(r.Context(),
		`INSERT INTO staff_invites (id, shop_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)`,
		inviteID, claims.ShopID, strings.ToLower(body.Email), token, expiresAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}

	slog.Info("staff invite created", "invite_id", inviteID, "email", body.Email, "token", token)
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":        inviteID,
		"email":     body.Email,
		"token":     token,
		"expiresAt": expiresAt,
	})
}

func (h *Handler) ListInvites(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	rows, err := h.db.QueryContext(r.Context(),
		`SELECT id, shop_id, email, token, expires_at, accepted_at, created_at
		 FROM staff_invites WHERE shop_id = ? AND accepted_at IS NULL AND expires_at > NOW()
		 ORDER BY created_at DESC`,
		claims.ShopID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	defer rows.Close()

	var invites []models.StaffInvite
	for rows.Next() {
		var inv models.StaffInvite
		if err := rows.Scan(&inv.ID, &inv.ShopID, &inv.Email, &inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
			return
		}
		invites = append(invites, inv)
	}
	if invites == nil {
		invites = []models.StaffInvite{}
	}
	writeJSON(w, http.StatusOK, invites)
}

func (h *Handler) RevokeInvite(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	inviteID := chi.URLParam(r, "id")

	res, err := h.db.ExecContext(r.Context(),
		`DELETE FROM staff_invites WHERE id = ? AND shop_id = ?`,
		inviteID, claims.ShopID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeError(w, http.StatusNotFound, "invite not found", "NOT_FOUND")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) RemoveStaff(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	targetID := chi.URLParam(r, "userId")

	if targetID == claims.UserID {
		writeError(w, http.StatusBadRequest, "cannot remove yourself", "CANNOT_REMOVE_SELF")
		return
	}

	res, err := h.db.ExecContext(r.Context(),
		`DELETE FROM users WHERE id = ? AND shop_id = ? AND role != 'owner'`,
		targetID, claims.ShopID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error", "INTERNAL_ERROR")
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeError(w, http.StatusNotFound, "staff member not found", "NOT_FOUND")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) issueToken(userID, shopID, role string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"shop_id": shopID,
		"role":    role,
		"iat":     time.Now().Unix(),
		"exp":     time.Now().Add(time.Duration(h.jwtTTLHours) * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	s = strings.ToLower(s)
	s = nonAlphanumRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > 80 {
		s = s[:80]
	}
	return s
}

func isDuplicateEntry(err error) bool {
	return err != nil && strings.Contains(err.Error(), "Duplicate entry")
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message, code string) {
	writeJSON(w, status, map[string]string{
		"error": message,
		"code":  code,
	})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err), "BAD_REQUEST")
		return false
	}
	return true
}
