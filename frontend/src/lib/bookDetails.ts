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
    const isbn = value.replace(/[-\s]/g, "").toUpperCase();
    if (!/^\d{9}[\dX]$/.test(isbn)) return isbn;
    const prefix = `978${isbn.slice(0, 9)}`;
    const sum = [...prefix].reduce(
        (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
        0
    );
    return `${prefix}${(10 - (sum % 10)) % 10}`;
}
