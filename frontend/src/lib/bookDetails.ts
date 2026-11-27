import type { BookMetadata } from "../types/book.ts";

export function bookPublicationDate(book: BookMetadata) {
    if (book.publicationDate) return book.publicationDate.replaceAll("-", ". ");
    if (book.pubDate == null) return "";
    const date = new Date(book.pubDate * 1000);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10).replaceAll("-", ". ");
}

// Compare the provider's ISBN-13 with books previously saved under ISBN-10.
export function comparableIsbn(value: string) {
    if (/^(tmdb-|musicbrainz-|google-books-)/.test(value)) return value;
    const isbn = value.replace(/[-\s]/g, "").toUpperCase();
    if (!/^\d{9}[\dX]$/.test(isbn)) return isbn;
    const prefix = `978${isbn.slice(0, 9)}`;
    const sum = [...prefix].reduce(
        (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
        0
    );
    return `${prefix}${(10 - (sum % 10)) % 10}`;
}

export function languageName(code?: string | null) {
    if (!code?.trim()) return "";
    try {
        return new Intl.DisplayNames(["ko"], { type: "language" }).of(code) || code;
    } catch {
        return code;
    }
}

export function searchFacts(
    book: BookMetadata & { title: string; author?: string | null; publisher?: string | null }
) {
    const date = bookPublicationDate(book);
    const duration =
        book.durationMillis && book.durationMillis > 0
            ? `${Math.floor(book.durationMillis / 60000)}:${String(Math.floor(book.durationMillis / 1000) % 60).padStart(2, "0")}`
            : "";
    const facts =
        book.mediaType === "MUSIC"
            ? [
                  ["아티스트", book.author],
                  ["수록 앨범", book.albumTitle],
                  ["재생시간", duration],
                  ["발매", date],
                  ["레이블", book.publisher]
              ]
            : book.mediaType === "TV" || book.mediaType === "MOVIE"
              ? [
                    [
                        "원제",
                        book.originalTitle?.trim() !== book.title.trim() ? book.originalTitle : ""
                    ],
                    ["언어", languageName(book.originalLanguage)],
                    [book.mediaType === "TV" ? "첫 방영" : "개봉", date],
                    ["제작", book.author],
                    ["제작사", book.publisher]
                ]
              : [
                    ["저자", book.author],
                    ["출판사", book.publisher],
                    ["출간", date]
                ];
    return facts
        .filter(([, value]) => value?.trim())
        .map(([label, value]) => ({ label: label!, value: value!.trim() }));
}
