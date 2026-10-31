package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.domain.BookStar;
import org.neatore.weeklycomma.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;
import java.util.List;

public interface BookStarRepository extends JpaRepository<BookStar, BookStar.Id> {
    interface CountByIsbn {
        String getIsbn();
        long getStarCount();
    }

    @Query("SELECT s.book.isbn AS isbn, COUNT(s) AS starCount FROM BookStar s WHERE s.book.isbn IN :isbns GROUP BY s.book.isbn")
    List<CountByIsbn> countForIsbns(@Param("isbns") List<String> isbns);

    @Query("SELECT s.book FROM BookStar s WHERE s.user = :user ORDER BY s.book.title ASC, s.book.isbn ASC")
    List<Book> findStarredBooks(@Param("user") User user);

    long countByBook(Book book);
    boolean existsByUserAndBook(User user, Book book);

    // SQLite's conflict handling keeps repeated/concurrent PUTs idempotent.
    @Modifying
    @Query(value = "INSERT INTO book_star (user_id, book_id) VALUES (:userId, :bookId) ON CONFLICT (user_id, book_id) DO NOTHING", nativeQuery = true)
    int addStar(@Param("userId") UUID userId, @Param("bookId") Integer bookId);

    @Modifying
    @Query("DELETE FROM BookStar s WHERE s.user = :user AND s.book = :book")
    int removeStar(@Param("user") User user, @Param("book") Book book);

    @Modifying
    @Query("DELETE FROM BookStar s WHERE s.book = :book")
    void deleteForBook(@Param("book") Book book);

    @Modifying
    @Query("DELETE FROM BookStar s WHERE s.user.id = :userId")
    void deleteForUser(@Param("userId") UUID userId);
}
