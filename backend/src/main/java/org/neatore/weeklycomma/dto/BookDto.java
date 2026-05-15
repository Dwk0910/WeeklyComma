package org.neatore.weeklycomma.dto;

import org.jetbrains.annotations.Nullable;

public class BookDto {
    public record BookResponse(
            String title,
            @Nullable String subtitle,
            String author,
            String publisher,
            String isbn,
            String aladinId,
            String pubDate,
            String description,
            String coverImg,
            boolean adult
    ) {}
}
