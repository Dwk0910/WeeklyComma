package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.BookStarDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


@Service
@RequiredArgsConstructor
public class BookStarService {
    private final BookRepository bookRepository;
    private final BookStarRepository bookStarRepository;

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
