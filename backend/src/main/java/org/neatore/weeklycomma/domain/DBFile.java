package org.neatore.weeklycomma.domain;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Entity;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;
import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DBFile {
    public DBFile(UUID id, FileExtension extension, String originalFileName) {
        this.id = id;
        this.extension = extension;
        this.originalFileName = originalFileName;
    }

    // 더 많은 파일의 지원은 여기에 확장자 추가
    public enum FileExtension {
        JPEG, JPG, PNG, PDF, WEBP, GIF, MP4, MOV, MKV, WEBM, MP3, WAV, M4A, OGG
    }

    @Id
    private UUID id;

    // Null denotes an existing/public site asset. Inquiry uploads are always private.
    @Setter private UUID ownerId;
    @Setter private Long inquiryId;
    @Setter private Long byteSize;
    @Setter private Instant uploadedAt;


    @Setter
    public String originalFileName;

    @Setter
    @Enumerated(EnumType.STRING)
    private FileExtension extension;
}
