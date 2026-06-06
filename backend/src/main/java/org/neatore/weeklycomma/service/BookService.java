package org.neatore.weeklycomma.service;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

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

@Service
@RequiredArgsConstructor
public class BookService {
    private final BookRepository bookRepository;
    private final APIService apiService;

    public List<BookDto.BookResponse> apiSearchBookByName(String name) {
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
                            Long.toString(LocalDate.parse(obj.getString("pubDate")).atStartOfDay().toEpochSecond(ZoneOffset.ofHours(9))),
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

    public void registerBook(BookDto.RegisterRequest registerRequest) {
        bookRepository.save(new Book(registerRequest.isbn(), registerRequest.title(), registerRequest.author(), registerRequest.publisher(), registerRequest.pubDate(), registerRequest.description()));
    }
}
