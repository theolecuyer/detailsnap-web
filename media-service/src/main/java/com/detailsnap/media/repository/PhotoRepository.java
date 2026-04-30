package com.detailsnap.media.repository;

import com.detailsnap.media.model.Photo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class PhotoRepository {

    private final JdbcTemplate jdbc;

    public PhotoRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<Photo> PHOTO_MAPPER = (rs, rowNum) -> {
        Photo p = new Photo();
        p.setId(rs.getString("id"));
        p.setShopId(rs.getString("shop_id"));
        p.setSessionId(rs.getString("session_id"));
        p.setS3Key(rs.getString("s3_key"));
        p.setContentType(rs.getString("content_type"));
        p.setSizeBytes(rs.getLong("size_bytes"));
        p.setTag(rs.getString("tag"));
        p.setCaption(rs.getString("caption"));
        p.setUploadedByUserId(rs.getString("uploaded_by_user_id"));
        p.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return p;
    };

    public void save(Photo photo) {
        jdbc.update(
            "INSERT INTO photos (id, shop_id, session_id, s3_key, content_type, size_bytes, tag, caption, uploaded_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            photo.getId(), photo.getShopId(), photo.getSessionId(), photo.getS3Key(),
            photo.getContentType(), photo.getSizeBytes(), photo.getTag(), photo.getCaption(),
            photo.getUploadedByUserId()
        );
    }

    public Optional<Photo> findById(String id) {
        List<Photo> results = jdbc.query(
            "SELECT * FROM photos WHERE id = ?", PHOTO_MAPPER, id
        );
        return results.stream().findFirst();
    }

    public List<Photo> findBySessionId(String sessionId) {
        return jdbc.query(
            "SELECT * FROM photos WHERE session_id = ? ORDER BY created_at ASC", PHOTO_MAPPER, sessionId
        );
    }

    public List<Photo> findUnassignedByShopId(String shopId) {
        return jdbc.query(
            "SELECT * FROM photos WHERE shop_id = ? AND session_id IS NULL ORDER BY created_at ASC",
            PHOTO_MAPPER, shopId
        );
    }

    public void updateCaptionAndTag(String id, String caption, String tag) {
        jdbc.update(
            "UPDATE photos SET caption = COALESCE(?, caption), tag = COALESCE(?, tag) WHERE id = ?",
            caption, tag, id
        );
    }

    public void delete(String id) {
        jdbc.update("DELETE FROM photos WHERE id = ?", id);
    }

    public boolean sessionBelongsToShop(String sessionId, String shopId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM sessions WHERE id = ? AND shop_id = ?",
            Integer.class, sessionId, shopId
        );
        return count != null && count > 0;
    }
}
