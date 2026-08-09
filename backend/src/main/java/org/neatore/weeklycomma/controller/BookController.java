package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.service.BookService;
import org.neatore.weeklycomma.dto.BookDto;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/books")
public class BookController {
    private final BookService bookService;

    @GetMapping
    public ResponseEntity<List<BookDto.BookResponse>> searchBooks(@RequestParam String query) {
        return ResponseEntity.ok(bookService.searchBooks(query));
    }

    @GetMapping("/api")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<List<BookDto.BookResponse>> searchBooksAPI(@RequestParam String query) {
        return ResponseEntity.ok(bookService.searchBooksAPI(query));
    }

    @PostMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> registerBook(@Valid @ModelAttribute BookDto.RegisterRequest request) {
        bookService.upsertBook(request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> deleteBook(@RequestParam String isbn) {
        bookService.deleteBook(isbn);
        return ResponseEntity.ok().build();
    }
}
