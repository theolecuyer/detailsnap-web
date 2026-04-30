package models

import "time"

type Shop struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Address   *string   `json:"address"`
	Phone     *string   `json:"phone"`
	Email     *string   `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type User struct {
	ID        string    `json:"id"`
	ShopID    string    `json:"shopId"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type StaffInvite struct {
	ID         string     `json:"id"`
	ShopID     string     `json:"shopId"`
	Email      string     `json:"email"`
	Token      string     `json:"token"`
	ExpiresAt  time.Time  `json:"expiresAt"`
	AcceptedAt *time.Time `json:"acceptedAt"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type Claims struct {
	UserID string `json:"user_id"`
	ShopID string `json:"shop_id"`
	Role   string `json:"role"`
}
