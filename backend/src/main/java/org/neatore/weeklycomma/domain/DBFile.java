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

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DBFile {
    public DBFile(UUID id, Boolean isSecured, FileExtension extension, String originalFileName) {
        this.id = id;
        this.isSecured = isSecured;
        this.extension = extension;
        this.originalFileName = originalFileName;
    }

    // 더 많은 파일의 지원은 여기에 확장자 추가
    public enum FileExtension {
        JPEG, JPG, PNG, PDF
    }

    @Id
    private UUID id;

    @Setter
    private Boolean isSecured;

    @Setter
    public String originalFileName;

    @Setter
    @Enumerated(EnumType.STRING)
    private FileExtension extension;
}
