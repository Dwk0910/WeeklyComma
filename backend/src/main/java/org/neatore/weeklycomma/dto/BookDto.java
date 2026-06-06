package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

public class BookDto {
    public record BookResponse(
            String title,
            String subtitle,
            String author,
            String publisher,
            String isbn,
            String pubDate,
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
            @NotBlank String pubDate,
            @NotBlank String coverImg,
            String description,
            Boolean adult
    ) {}
}
