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
            @NotBlank String isbn,
            @NotBlank String title,
            @NotBlank String subtitle,
            @NotBlank String author,
            @NotBlank String publisher,
            @NotNull Long pubDate,
            @NotBlank String coverImg,
            MultipartFile customCoverImg,
            String description,
            String difficulty,
            Boolean adult
    ) {
        public LocalDateTime getPubDateAsLocalDateTime() {
            return LocalDateTime.ofEpochSecond(pubDate, 0, ZoneOffset.ofHours(0));
        }
    }
}
