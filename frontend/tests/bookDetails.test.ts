import assert from "node:assert/strict";
import test from "node:test";
import { bookPublicationDate, comparableIsbn } from "../src/lib/bookDetails.ts";

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
