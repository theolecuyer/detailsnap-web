package com.detailsnap.media.model;

import java.time.LocalDateTime;

public class Photo {
    private String id;
    private String shopId;
    private String sessionId;
    private String s3Key;
    private String contentType;
    private long sizeBytes;
    private String tag;
    private String caption;
    private String uploadedByUserId;
    private LocalDateTime createdAt;

    // transient — not stored in DB
    private String url;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getShopId() { return shopId; }
    public void setShopId(String shopId) { this.shopId = shopId; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getS3Key() { return s3Key; }
    public void setS3Key(String s3Key) { this.s3Key = s3Key; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public String getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(String uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
