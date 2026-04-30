package com.detailsnap.media.service;

import com.detailsnap.media.model.Photo;
import com.detailsnap.media.repository.PhotoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PhotoService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final long MAX_SIZE_BYTES = 15L * 1024 * 1024;
    private static final Map<String, String> EXT_MAP = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final PhotoRepository photoRepo;

    @Value("${app.s3.bucket}")
    private String bucket;

    @Value("${app.s3.presigned-url-ttl-seconds}")
    private long presignedUrlTtlSeconds;

    public PhotoService(S3Client s3Client, S3Presigner s3Presigner, PhotoRepository photoRepo) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.photoRepo = photoRepo;
    }

    public Photo upload(MultipartFile file, String shopId, String sessionId, String tag, String caption, String userId) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPEG, PNG, and WebP images are allowed");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds 15MB limit");
        }

        String ext = EXT_MAP.getOrDefault(contentType, "jpg");
        String uuid = UUID.randomUUID().toString();
        String sessionSegment = sessionId != null ? "sessions/" + sessionId : "unassigned";
        String s3Key = String.format("shops/%s/%s/%s.%s", shopId, sessionSegment, uuid, ext);

        PutObjectRequest putReq = PutObjectRequest.builder()
                .bucket(bucket)
                .key(s3Key)
                .contentType(contentType)
                .serverSideEncryption("AES256")
                .build();
        s3Client.putObject(putReq, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        Photo photo = new Photo();
        photo.setId(uuid);
        photo.setShopId(shopId);
        photo.setSessionId(sessionId);
        photo.setS3Key(s3Key);
        photo.setContentType(contentType);
        photo.setSizeBytes(file.getSize());
        photo.setTag(tag);
        photo.setCaption(caption);
        photo.setUploadedByUserId(userId);
        photoRepo.save(photo);

        photo.setUrl(presign(s3Key));
        return photo;
    }

    public Photo getById(String id) {
        return photoRepo.findById(id).map(p -> { p.setUrl(presign(p.getS3Key())); return p; }).orElse(null);
    }

    public List<Photo> listBySession(String sessionId) {
        return photoRepo.findBySessionId(sessionId).stream()
                .peek(p -> p.setUrl(presign(p.getS3Key())))
                .collect(Collectors.toList());
    }

    public List<Photo> listUnassigned(String shopId) {
        return photoRepo.findUnassignedByShopId(shopId).stream()
                .peek(p -> p.setUrl(presign(p.getS3Key())))
                .collect(Collectors.toList());
    }

    public Photo updateMeta(String id, String caption, String tag) {
        photoRepo.updateCaptionAndTag(id, caption, tag);
        return getById(id);
    }

    public void delete(String id, String s3Key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(s3Key).build());
        photoRepo.delete(id);
    }

    public boolean sessionBelongsToShop(String sessionId, String shopId) {
        return photoRepo.sessionBelongsToShop(sessionId, shopId);
    }

    private String presign(String key) {
        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofSeconds(presignedUrlTtlSeconds))
                        .getObjectRequest(r -> r.bucket(bucket).key(key))
                        .build()
        );
        return presigned.url().toString();
    }
}
