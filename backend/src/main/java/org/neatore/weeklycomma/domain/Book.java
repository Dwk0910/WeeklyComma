package org.neatore.weeklycomma.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.neatore.weeklycomma.dto.BookDto;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Book {
    public Book(String isbn, String title, String author, String publisher, LocalDateTime pubDate, String description, String difficulty) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
        this.publisher = publisher;
        this.pubDate = pubDate;
        this.description = description;
        this.difficulty = difficulty;
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
    private String description;
    private String coverImg;
    private String difficulty;
    private LocalDateTime pubDate;
    private Boolean adult;

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
}
