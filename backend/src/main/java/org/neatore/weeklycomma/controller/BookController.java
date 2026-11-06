package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.service.BookService;
import org.neatore.weeklycomma.service.BookStarService;
import org.neatore.weeklycomma.service.JwtService;
import org.neatore.weeklycomma.dto.BookStarDto;
import org.neatore.weeklycomma.dto.PopularBookDto;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.dto.StarredBookDto;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
    private final BookStarService bookStarService;
    private final JwtService jwtService;

    @GetMapping("/starred")
    @RequiresAuthentication
    public ResponseEntity<List<StarredBookDto>> getStarredBooks(@CookieValue("WCA_ACCESS") String token) {
        return ResponseEntity.ok(bookStarService.getStarredBooks(jwtService.getUser(token)));
    }

    @GetMapping("/popular")
    public ResponseEntity<List<PopularBookDto>> getPopularRecommendations(@RequestParam(defaultValue = "6") int limit) {
        return ResponseEntity.ok(bookStarService.getPopularRecommendations(limit));
    }

    @GetMapping("/{isbn}/star")
    public ResponseEntity<BookStarDto> getStarStatus(@PathVariable String isbn,
            @CookieValue(value = "WCA_ACCESS", required = false) String token) {
        User user = token != null && jwtService.validateToken(token) ? jwtService.getUser(token) : null;
        return ResponseEntity.ok(bookStarService.getStatus(isbn, user));
    }

    @PutMapping("/{isbn}/star")
    @RequiresAuthentication
    public ResponseEntity<BookStarDto> addStar(@PathVariable String isbn, @CookieValue("WCA_ACCESS") String token) {
        return ResponseEntity.ok(bookStarService.addStar(isbn, jwtService.getUser(token)));
    }

    @DeleteMapping("/{isbn}/star")
    @RequiresAuthentication
    public ResponseEntity<BookStarDto> removeStar(@PathVariable String isbn, @CookieValue("WCA_ACCESS") String token) {
        return ResponseEntity.ok(bookStarService.removeStar(isbn, jwtService.getUser(token)));
    }

    @GetMapping
    public ResponseEntity<List<BookDto.BookResponse>> searchBooks(@RequestParam String query) {
        return ResponseEntity.ok(bookService.searchBooks(query));
    }

    @GetMapping("/{isbn}")
    public ResponseEntity<BookDto.BookResponse> getBook(@PathVariable String isbn) {
        return ResponseEntity.ok(bookService.getBookByIsbn(isbn).toDto());
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
