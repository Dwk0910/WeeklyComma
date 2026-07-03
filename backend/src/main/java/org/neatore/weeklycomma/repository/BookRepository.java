package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Book;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {
    Book getBookByIsbn(String isbn);
    List<Book> searchBooksByTitleContaining(String title);
}
