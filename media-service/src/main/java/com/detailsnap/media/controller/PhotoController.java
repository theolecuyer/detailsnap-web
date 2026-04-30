package com.detailsnap.media.controller;

import com.detailsnap.media.model.JwtClaims;
import com.detailsnap.media.model.Photo;
import com.detailsnap.media.service.PhotoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/photos")
public class PhotoController {

    private static final Set<String> VALID_TAGS = Set.of("before", "after", "inspection", "general");

    private final PhotoService photoService;

    public PhotoController(PhotoService photoService) {
        this.photoService = photoService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String sessionId,
            @RequestParam(defaultValue = "general") String tag,
            @RequestParam(required = false) String caption,
            HttpServletRequest request) {

        JwtClaims claims = getClaims(request);
        if (!VALID_TAGS.contains(tag)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tag", "code", "VALIDATION_ERROR"));
        }
        if (sessionId != null && !photoService.sessionBelongsToShop(sessionId, claims.getShopId())) {
            return ResponseEntity.status(403).body(Map.of("error", "Session not found in shop", "code", "FORBIDDEN"));
        }
        try {
            Photo photo = photoService.upload(file, claims.getShopId(), sessionId, tag, caption, claims.getUserId());
            return ResponseEntity.status(HttpStatus.CREATED).body(photo);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "code", "VALIDATION_ERROR"));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed", "code", "UPLOAD_ERROR"));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false, defaultValue = "false") boolean unassigned,
            HttpServletRequest request) {

        JwtClaims claims = getClaims(request);
        List<Photo> photos;
        if (unassigned) {
            photos = photoService.listUnassigned(claims.getShopId());
        } else if (sessionId != null) {
            if (!photoService.sessionBelongsToShop(sessionId, claims.getShopId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Session not found in shop", "code", "FORBIDDEN"));
            }
            photos = photoService.listBySession(sessionId);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Provide sessionId or unassigned=true", "code", "VALIDATION_ERROR"));
        }
        return ResponseEntity.ok(photos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id, HttpServletRequest request) {
        JwtClaims claims = getClaims(request);
        Photo photo = photoService.getById(id);
        if (photo == null || !photo.getShopId().equals(claims.getShopId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Photo not found", "code", "NOT_FOUND"));
        }
        return ResponseEntity.ok(photo);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        JwtClaims claims = getClaims(request);
        Photo existing = photoService.getById(id);
        if (existing == null || !existing.getShopId().equals(claims.getShopId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Photo not found", "code", "NOT_FOUND"));
        }
        String tag = body.get("tag");
        if (tag != null && !VALID_TAGS.contains(tag)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid tag", "code", "VALIDATION_ERROR"));
        }
        Photo updated = photoService.updateMeta(id, body.get("caption"), tag);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, HttpServletRequest request) {
        JwtClaims claims = getClaims(request);
        Photo existing = photoService.getById(id);
        if (existing == null || !existing.getShopId().equals(claims.getShopId())) {
            return ResponseEntity.status(404).body(Map.of("error", "Photo not found", "code", "NOT_FOUND"));
        }
        photoService.delete(id, existing.getS3Key());
        return ResponseEntity.noContent().build();
    }

    private JwtClaims getClaims(HttpServletRequest request) {
        return (JwtClaims) request.getAttribute("jwtClaims");
    }
}
