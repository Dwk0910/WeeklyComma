package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

public class BookDto {
    public record BookResponse(
            String title,
            String subtitle,
            String author,
            String publisher,
            String isbn,
            Long pubDate,
            String coverImg,
            String description,
            Boolean adult
    ) {}

    public record RegisterRequest(
            @NotBlank String title,
            @NotBlank String subtitle,
            @NotBlank String isbn,
            @NotBlank String author,
            @NotBlank String publisher,
            @NotBlank String coverImg,
            @NotNull Long pubDate,
            MultipartFile customCoverImg,
            String description,
            Boolean adult,
            String difficulty
    ) {
        public LocalDateTime getPubDateAsLocalDateTime() {
            return LocalDateTime.ofEpochSecond(pubDate, 0, ZoneOffset.ofHours(0));
        }
    }
}
