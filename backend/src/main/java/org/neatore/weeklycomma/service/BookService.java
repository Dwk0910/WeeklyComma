package org.neatore.weeklycomma.service;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import org.neatore.weeklycomma.domain.Book;
import org.neatore.weeklycomma.dto.BookDto;
import org.neatore.weeklycomma.repository.BookRepository;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookRepository bookRepository;
    private final APIService apiService;

    public List<BookDto.BookResponse> searchBooks(String title) {
        List<BookDto.BookResponse> result = new ArrayList<>();
        bookRepository.searchBooksByTitle(title).forEach(book -> result.add(new BookDto.BookResponse(book.getTitle(), book.getSubTitle(), book.getAuthor(), book.getPublisher(), book.getIsbn(), book.getPubDate().toEpochSecond(ZoneOffset.ofHours(0)), book.getCoverImg(), book.getDescription(), book.getAdult())));
        return result;
    }

    public List<BookDto.BookResponse> searchBooksAPI(String name) {
        List<BookDto.BookResponse> result = new ArrayList<>();
        try {
            JSONArray apiResult = apiService.searchBooks(name, "TITLE").optJSONArray("item", new JSONArray());

            for (int i = 0; i < apiResult.length(); i++) {
                JSONObject obj = apiResult.getJSONObject(i);

                String originalTitle = obj.getString("title");
                String title = originalTitle.split("-")[0].trim();
                String subtitle = null;
                try {
                    subtitle = Arrays.stream(originalTitle.split("-")).toList().get(1);
                } catch (ArrayIndexOutOfBoundsException ignored) {}

                    result.add(new BookDto.BookResponse(
                            title,
                            subtitle,
                            obj.getString("author"),
                            obj.getString("publisher"),
                            obj.getString("isbn"),
                            LocalDate.parse(obj.getString("pubDate")).atStartOfDay().toEpochSecond(ZoneOffset.ofHours(0)),
                            obj.getString("cover"),
                            obj.getString("description"),
                            obj.getBoolean("adult")
                    ));
            }
        } catch (JSONException e) {
            LOGGER.error("apiSearchBookByName: JSON parsing error ", e);
        }

        return result;
    }

    public Book getBookByIsbn(String isbn) {
        return bookRepository.getBookByIsbn(isbn);
    }

    @Transactional
    public void upsertBook(BookDto.RegisterRequest request) {
        Optional.ofNullable(this.getBookByIsbn(request.isbn()))
                .ifPresentOrElse(
                        book -> book.updateFrom(request),
                        () -> bookRepository.save(new Book(request.isbn(), request.title(), request.author(), request.publisher(), request.getPubDateAsLocalDateTime(), request.description(), request.difficulty()))
                );
    }
}
