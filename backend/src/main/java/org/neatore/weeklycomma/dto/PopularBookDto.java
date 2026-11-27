package org.neatore.weeklycomma.dto;

import org.neatore.weeklycomma.domain.MediaType;

public record PopularBookDto(String isbn, String title, String coverImg, String customCoverImg, long starCount, MediaType mediaType) {
    public PopularBookDto { if (mediaType == null) mediaType = MediaType.BOOK; }
}
