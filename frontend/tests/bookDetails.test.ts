import assert from "node:assert/strict";
import test from "node:test";
import { bookPublicationDate, comparableIsbn, searchFacts } from "../src/lib/bookDetails.ts";

test("publication dates preserve the precision supplied by the catalogue", () => {
    assert.equal(bookPublicationDate({ publicationDate: "2026" }), "2026");
    assert.equal(bookPublicationDate({ publicationDate: "2026-11" }), "2026. 11");
    assert.equal(bookPublicationDate({ publicationDate: "2026-11-15" }), "2026. 11. 15");
    assert.equal(bookPublicationDate({ pubDate: 0 }), "1970. 01. 01");
    assert.equal(bookPublicationDate({ pubDate: null }), "");
    assert.equal(bookPublicationDate({}), "");
});

test("old ISBN-10 and new ISBN-13 results compare as the same book", () => {
    assert.equal(comparableIsbn("8937480255"), comparableIsbn("978-89-374-8025-6"));
    assert.notEqual(comparableIsbn("9788937480256"), comparableIsbn("9791190090018"));
});

test("external catalogue keys retain case and do not collide across media", () => {
    assert.equal(comparableIsbn("google-books-abC_12"), "google-books-abC_12");
    assert.notEqual(comparableIsbn("google-books-abC_12"), comparableIsbn("google-books-abc_12"));
    assert.notEqual(comparableIsbn("tmdb-tv-7"), comparableIsbn("tmdb-movie-7"));
});

test("search metadata uses meaningful fields for each media type", () => {
    const movie = searchFacts({
        title: "영웅",
        mediaType: "MOVIE",
        originalTitle: "英雄",
        originalLanguage: "zh",
        publicationDate: "2002-12-19",
        author: "",
        publisher: " "
    });
    assert.deepEqual(
        movie.map((x) => x.label),
        ["원제", "언어", "개봉"]
    );
    assert.equal(movie[0].value, "英雄");
    const song = searchFacts({
        title: "갑자기",
        mediaType: "MUSIC",
        author: "아이오아이",
        albumTitle: "I.O.I : LOOP",
        durationMillis: 195000
    });
    assert.deepEqual(
        song.map((x) => x.value),
        ["아이오아이", "I.O.I : LOOP", "3:15"]
    );
    assert.deepEqual(searchFacts({ title: "책", author: " ", publisher: "" }), []);
});
