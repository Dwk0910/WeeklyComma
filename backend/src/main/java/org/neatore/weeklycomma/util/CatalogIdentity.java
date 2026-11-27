package org.neatore.weeklycomma.util;

import org.neatore.weeklycomma.domain.MediaType;
import org.neatore.weeklycomma.dto.BookDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class CatalogIdentity {
    private CatalogIdentity() {}
    public static String comparable(String key) {
        String isbn = BookIsbn.canonical(key);
        return isbn == null ? key : isbn;
    }
    public static String sourceUrl(String source, String id) {
        if (source == null || id == null) return null;
        return switch (source) {
            case "GOOGLE_BOOKS" -> id.matches("[A-Za-z0-9_-]{1,100}") ? "https://books.google.com/books?id=" + id : null;
            case "TMDB" -> id.matches("(tv|movie)/[1-9][0-9]*") ? "https://www.themoviedb.org/" + id : null;
            case "MUSICBRAINZ" -> id.matches("[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}") ? "https://musicbrainz.org/release/" + id : null;
            default -> null;
        };
    }
    public static void validate(BookDto.RegisterRequest request) {
        MediaType type = request.mediaType() == null ? MediaType.BOOK : request.mediaType();
        String expected = switch (type) {
            case BOOK -> "google-books-" + request.sourceId();
            case MUSIC -> "musicbrainz-" + request.sourceId();
            case TV -> "tmdb-tv-" + suffix(request.sourceId());
            case MOVIE -> "tmdb-movie-" + suffix(request.sourceId());
        };
        // Existing books, including legacy ISBN-10 links, keep their identifiers.
        if (type == MediaType.BOOK && BookIsbn.canonical(request.isbn()) != null) return;
        String provider = switch (type) { case BOOK -> "GOOGLE_BOOKS"; case MUSIC -> "MUSICBRAINZ"; default -> "TMDB"; };
        boolean kindMatches = type != MediaType.TV && type != MediaType.MOVIE
                || request.sourceId() != null && request.sourceId().startsWith(type == MediaType.TV ? "tv/" : "movie/");
        if (!expected.equals(request.isbn()) || !provider.equals(request.source()) || !kindMatches
                || sourceUrl(request.source(), request.sourceId()) == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자료 유형과 식별 정보를 확인해 주세요.");
    }
    private static String suffix(String id) { return id == null ? "" : id.substring(id.lastIndexOf('/') + 1); }
}
