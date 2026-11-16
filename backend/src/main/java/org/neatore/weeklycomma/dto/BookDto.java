package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

public class BookDto {
    public record BookResponse(
            String title,
            String subtitle,
            String author,
            String publisher,
            String isbn,
            Long pubDate,
            String coverImg,
            String customCoverImg,
            String description,
            String difficulty,
            Boolean adult,
            String pageCount,
            String bookSize,
            String seriesTitle,
            String edition,
            String tableOfContents,
            String publicationDate
    ) {}

    public record RegisterRequest(
            @NotBlank String isbn,
            @NotBlank String title,
            String subtitle,
            @NotBlank String author,
            @NotBlank String publisher,
            Long pubDate,
            String coverImg,
            MultipartFile customCoverImg,
            String description,
            String difficulty,
            Boolean adult,
            String pageCount,
            String bookSize,
            String seriesTitle,
            String edition,
            String tableOfContents,
            String publicationDate,
            Boolean deleteCustomCover
    ) {
        public Instant getPubDateAsInstant() {
            return pubDate == null ? null : Instant.ofEpochSecond(pubDate);
        }
    }
}
