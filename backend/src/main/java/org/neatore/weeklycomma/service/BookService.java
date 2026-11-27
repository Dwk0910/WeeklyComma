package org.neatore.weeklycomma.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.repository.BookRepository;
import org.neatore.weeklycomma.repository.BookStarRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.neatore.weeklycomma.util.BookIsbn;

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookRepository bookRepository;
    private final DBFileService dbFileService;
    private final NationalLibraryBookClient bookClient;
    private final BookStarRepository bookStarRepository;
    private final CatalogSearchService catalogSearch;

    public List<BookDto.BookResponse> searchBooks(String query) {
        if (BookIsbn.canonical(query) != null)
            return bookRepository.findByIsbnIn(BookIsbn.aliases(query)).stream().map(Book::toDto).toList();
        return bookRepository.searchBooksByTitleContaining(query).stream().map(Book::toDto).toList();
    }

    public List<BookDto.BookResponse> searchBooksAPI(String query) {
        return resolveSavedBooks(bookClient.searchBooks(query));
    }

    public BookDto.SearchPage searchBookPage(String query, String author, int page) {
        var result = bookClient.searchPage(query, author, page);
        return new BookDto.SearchPage(resolveSavedBooks(result.items()), result.page(), result.total(), result.hasMore());
    }

    public BookDto.SearchPage searchCatalog(String query, String author, int page,
            org.neatore.weeklycomma.domain.MediaType type, String provider) {
        var result = catalogSearch.search(query, author, page, type, provider);
        return new BookDto.SearchPage(resolveSavedBooks(result.items()), result.page(), result.total(), result.hasMore());
    }

    public BookDto.BookResponse catalogDetails(String source, String sourceId) {
        return resolveSavedBooks(List.of(catalogSearch.details(source, sourceId))).get(0);
    }

    private List<BookDto.BookResponse> resolveSavedBooks(List<BookDto.BookResponse> results) {
        if (results.isEmpty()) return results;
        var identifiers = results.stream().flatMap(book -> BookIsbn.aliases(book.isbn()).stream()).distinct().toList();
        var saved = bookRepository.findByIsbnIn(identifiers).stream().collect(Collectors.toMap(
                book -> org.neatore.weeklycomma.util.CatalogIdentity.comparable(book.getIsbn()), Function.identity(), (first, ignored) -> first));
        return results.stream().map(book -> {
            // Old Aladin records used ISBN-10. Keep their existing identifiers and history links.
            Book existing = saved.get(org.neatore.weeklycomma.util.CatalogIdentity.comparable(book.isbn()));
            return existing == null ? book : existing.toDto();
        }).toList();
    }

    public Book getBookByIsbn(String isbn) {
        Book exact = bookRepository.getBookByIsbn(isbn);
        if (exact != null) return exact;
        return bookRepository.findByIsbnIn(BookIsbn.aliases(isbn)).stream().findFirst().orElse(null);
    }

    @Transactional
    public void upsertBook(BookDto.RegisterRequest request) {
        org.neatore.weeklycomma.util.CatalogIdentity.validate(request);
        Book book = getBookByIsbn(request.isbn());
        if (book == null) book = bookRepository.save(new Book(request));
        else book.updateFrom(request);

        boolean hasUpload = request.customCoverImg() != null && !request.customCoverImg().isEmpty();
        if (hasUpload || Boolean.TRUE.equals(request.deleteCustomCover())) {
            String previous = book.getCustomCoverImg();
            book.setCustomCoverImg(hasUpload ? dbFileService.save(request.customCoverImg()).toString() : null);
            if (previous != null) dbFileService.delete(previous);
        }
    }

    private final AdminSettingService adminSettingService;

    @Transactional
    public void deleteBook(String isbn) {
        Book b = this.getBookByIsbn(isbn);
        String storedIsbn = b == null ? isbn : b.getIsbn();
        if (b != null && b.getCustomCoverImg() != null) this.dbFileService.delete(b.getCustomCoverImg());

        this.adminSettingService.getAdminSettingsByValue(storedIsbn)
                .forEach(this.adminSettingService::deleteAdminSetting);
        if (b != null) bookStarRepository.deleteForBook(b);
        bookRepository.deleteBookByIsbn(storedIsbn);
    }
}
