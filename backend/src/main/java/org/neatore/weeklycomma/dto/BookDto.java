package org.neatore.weeklycomma.dto;

import org.jetbrains.annotations.Nullable;

public class BookDto {
    public record BookResponse(
            String title,
            @Nullable String subtitle,
            String author,
            String publisher,
            String isbn,
            String pubDate,
            String description,
            String coverImg,
            boolean adult
    ) {}

    public record RegisterRequest(
            String title,
            String subtitle,
            String isbn,
            String author,
            String publisher,
            String pubDate,
            String description,
            String coverImg,
            boolean adult
    ) {}
}
