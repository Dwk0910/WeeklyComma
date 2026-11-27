package org.neatore.weeklycomma.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import lombok.Setter;

import org.neatore.weeklycomma.dto.BookDto;

import java.time.Instant;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Book {
    public Book(BookDto.RegisterRequest book) {
        this.isbn = book.isbn();
        updateFrom(book);
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    private String isbn;

    // Legacy ISBN column remains the stable recommendation key for existing links.
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private MediaType mediaType;
    private String source;
    private String sourceId;
    private String sourceUrl;
    private String albumTitle;
    private Long durationMillis;

    public MediaType getMediaType() { return mediaType == null ? MediaType.BOOK : mediaType; }

    private String title;
    private String subTitle;
    private String author;
    private String publisher;
    private Instant pubDate;
    private String coverImg;
    private String description;
    private String difficulty;
    private Boolean adult;

    @Setter
    private String customCoverImg;

    private String pageCount;
    private String bookSize;
    private String seriesTitle;
    private String edition;
    @Column(columnDefinition = "TEXT")
    private String tableOfContents;
    private String publicationDate;

    public void updateFrom(BookDto.RegisterRequest from) {
        this.mediaType = from.mediaType() == null ? MediaType.BOOK : from.mediaType();
        this.source = from.source();
        this.sourceId = from.sourceId();
        this.sourceUrl = org.neatore.weeklycomma.util.CatalogIdentity.sourceUrl(from.source(), from.sourceId());
        this.albumTitle = from.albumTitle();
        this.durationMillis = from.durationMillis();
        this.title = from.title();
        this.subTitle = from.subtitle();
        this.author = from.author() == null ? "" : from.author();
        this.publisher = from.publisher() == null ? "" : from.publisher();
        this.pubDate = from.getPubDateAsInstant();
        this.description = from.description();
        this.coverImg = from.coverImg();
        this.adult = from.adult();
        this.difficulty = from.difficulty();
        this.pageCount = from.pageCount();
        this.bookSize = from.bookSize();
        this.seriesTitle = from.seriesTitle();
        this.edition = from.edition();
        this.tableOfContents = from.tableOfContents();
        this.publicationDate = from.publicationDate();
    }

    public BookDto.BookResponse toDto() {
        return new BookDto.BookResponse(title, subTitle, author, publisher, isbn, pubDate == null ? null : pubDate.getEpochSecond(),
                coverImg, customCoverImg, description, difficulty, adult, pageCount, bookSize, seriesTitle,
                edition, tableOfContents, publicationDate, getMediaType(), source, sourceId, sourceUrl, albumTitle, durationMillis);
    }
}
