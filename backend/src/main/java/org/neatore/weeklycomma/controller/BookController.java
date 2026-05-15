package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.service.BookService;
import org.neatore.weeklycomma.dto.BookDto;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/book")
public class BookController {
    private final BookService bookService;

    @GetMapping("/search")
    public ResponseEntity<List<BookDto.BookResponse>> searchBooks(@RequestParam String query) {
        return ResponseEntity.ok(bookService.apiSearchBookByName(query));
    }
}
