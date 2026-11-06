package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Book;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.neatore.weeklycomma.dto.PopularBookDto;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {
    Book getBookByIsbn(String isbn);
    List<Book> findByIsbnIn(List<String> isbns);
    List<Book> searchBooksByTitleContaining(String title);
    void deleteBookByIsbn(String isbn);

    @Query("""
            SELECT new org.neatore.weeklycomma.dto.PopularBookDto(
                b.isbn, b.title, b.coverImg, b.customCoverImg, COUNT(s))
            FROM Book b JOIN BookStar s ON s.book = b
            WHERE EXISTS (SELECT h.id FROM RecommendationHistory h WHERE h.isbn = b.isbn)
            GROUP BY b.id, b.isbn, b.title, b.coverImg, b.customCoverImg
            HAVING COUNT(s) > 10
            ORDER BY COUNT(s) DESC, b.isbn ASC
            """)
    List<PopularBookDto> findPopularRecommendations(Pageable pageable);
}
