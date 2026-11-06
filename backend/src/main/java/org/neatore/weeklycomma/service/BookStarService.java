package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.BookStarDto;
import org.neatore.weeklycomma.dto.PopularBookDto;
import org.neatore.weeklycomma.dto.StarredBookDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookStarService {
    private final BookRepository bookRepository;
    private final BookStarRepository bookStarRepository;
    private final RecommendationExpirationService recommendationExpirationService;

    @Transactional(readOnly = true)
    public List<StarredBookDto> getStarredBooks(User user) {
        requireUser(user);
        var books = bookStarRepository.findStarredBooks(user);
        if (books.isEmpty()) return List.of();
        var isbns = books.stream().map(Book::getIsbn).toList();
        var counts = bookStarRepository.countForIsbns(isbns).stream().collect(Collectors.toMap(
                BookStarRepository.CountByIsbn::getIsbn, BookStarRepository.CountByIsbn::getStarCount));
        return books.stream().map(book -> new StarredBookDto(book.toDto(), counts.getOrDefault(book.getIsbn(), 0L))).toList();
    }

    @Transactional(readOnly = true)
    public BookStarDto getStatus(String isbn, User user) {
        return status(requireBook(isbn), user);
    }

    @Transactional
    public BookStarDto addStar(String isbn, User user) {
        requireUser(user);
        Book book = requireBook(isbn);
        bookStarRepository.addStar(user.getId(), book.getId());
        return status(book, user);
    }

    @Transactional
    public BookStarDto removeStar(String isbn, User user) {
        requireUser(user);
        Book book = requireBook(isbn);
        bookStarRepository.removeStar(user, book);
        return status(book, user);
    }

    @Transactional
    public List<PopularBookDto> getPopularRecommendations(int limit) {
        if (limit < 1 || limit > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "조회 개수는 1~50개여야 합니다.");
        }
        recommendationExpirationService.expireRecommendations();
        return bookRepository.findPopularRecommendations(PageRequest.of(0, limit));
    }

    private BookStarDto status(Book book, User user) {
        return new BookStarDto(bookStarRepository.countByBook(book),
                user != null && bookStarRepository.existsByUserAndBook(user, book));
    }

    private Book requireBook(String isbn) {
        Book book = bookRepository.getBookByIsbn(isbn);
        if (book == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "도서를 찾을 수 없습니다.");
        return book;
    }

    private void requireUser(User user) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
}
