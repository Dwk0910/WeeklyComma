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

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Book {
    public Book(BookDto.RegisterRequest book) {
        this.isbn = book.isbn();
        this.title = book.title();
        this.subTitle = book.subtitle();
        this.author = book.author();
        this.publisher = book.publisher();
        this.pubDate = book.getPubDateAsLocalDateTime();
        this.coverImg = book.coverImg();
        this.description = book.description();
        this.difficulty = book.difficulty();
        this.adult = book.adult();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true)
    private String isbn;

    private String title;
    private String subTitle;
    private String author;
    private String publisher;
    private LocalDateTime pubDate;
    private String coverImg;
    private String description;
    private String difficulty;
    private Boolean adult;

    @Setter
    private String customCoverImg;

    public void updateFrom(BookDto.RegisterRequest from) {
        this.title = from.title();
        this.subTitle = from.subtitle();
        this.author = from.author();
        this.publisher = from.publisher();
        this.pubDate = from.getPubDateAsLocalDateTime();
        this.description = from.description();
        this.coverImg = from.coverImg();
        this.adult = from.adult();
        this.difficulty = from.difficulty();
    }

    public BookDto.BookResponse toDto() {
        return new BookDto.BookResponse(title, subTitle, author, publisher, isbn, pubDate.toEpochSecond(ZoneOffset.ofHours(0)), coverImg, customCoverImg, description, difficulty, adult);
    }
}
