package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;
import org.neatore.weeklycomma.domain.MediaType;

import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

public class BookDto {
    public record SearchPage(java.util.List<BookResponse> items, int page, long total, boolean hasMore) {}

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
            String publicationDate,
            MediaType mediaType,
            String source,
            String sourceId,
            String sourceUrl
    ) {
        public BookResponse(String title, String subtitle, String author, String publisher, String isbn, Long pubDate, String coverImg, String customCoverImg, String description, String difficulty, Boolean adult, String pageCount, String bookSize, String seriesTitle, String edition, String tableOfContents, String publicationDate) {
            this(title, subtitle, author, publisher, isbn, pubDate, coverImg, customCoverImg, description, difficulty, adult, pageCount, bookSize, seriesTitle, edition, tableOfContents, publicationDate, MediaType.BOOK, null, null, null);
        }
}

    public record RegisterRequest(
            @NotBlank String isbn,
            @NotBlank String title,
            String subtitle,
            String author,
            String publisher,
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
            Boolean deleteCustomCover,
            MediaType mediaType,
            String source,
            String sourceId,
            String sourceUrl
    ) {
        public RegisterRequest(String isbn, String title, String subtitle, String author, String publisher, Long pubDate, String coverImg, MultipartFile customCoverImg, String description, String difficulty, Boolean adult, String pageCount, String bookSize, String seriesTitle, String edition, String tableOfContents, String publicationDate, Boolean deleteCustomCover) {
            this(isbn, title, subtitle, author, publisher, pubDate, coverImg, customCoverImg, description, difficulty, adult, pageCount, bookSize, seriesTitle, edition, tableOfContents, publicationDate, deleteCustomCover, MediaType.BOOK, null, null, null);
        }

        public Instant getPubDateAsInstant() {
            return pubDate == null ? null : Instant.ofEpochSecond(pubDate);
        }
    }
}
