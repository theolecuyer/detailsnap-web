package com.detailsnap.media.model;

public class JwtClaims {
    private final String userId;
    private final String shopId;
    private final String role;

    public JwtClaims(String userId, String shopId, String role) {
        this.userId = userId;
        this.shopId = shopId;
        this.role = role;
    }

    public String getUserId() { return userId; }
    public String getShopId() { return shopId; }
    public String getRole() { return role; }
}
