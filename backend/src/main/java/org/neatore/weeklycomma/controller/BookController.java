package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.service.BookService;
import org.neatore.weeklycomma.dto.BookDto;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/book")
public class BookController {
    private final BookService bookService;

    @GetMapping("/searchAPI")
    public ResponseEntity<List<BookDto.BookResponse>> searchBooks(@Valid @RequestParam String query) {
        return ResponseEntity.ok(bookService.apiSearchBookByName(query));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> registerBook(@Valid @RequestBody BookDto.RegisterRequest request) {
        bookService.registerBook(request);
        return ResponseEntity.ok().build();
    }
}
