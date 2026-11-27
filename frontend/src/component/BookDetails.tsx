import { mediaLabel, musicDuration, type BookMetadata } from "../types/book.ts";
import { bookPublicationDate, languageName } from "../lib/bookDetails.ts";
import { plainText } from "../pages/admin/recommendations/types.ts";

export default function BookDetails({ book }: { book: BookMetadata & { isbn: string } }) {
    const isBook = !book.mediaType || book.mediaType === "BOOK";
    const facts = [
        ["종류", mediaLabel(book)],
        ["원제", book.originalTitle],
        ["언어", languageName(book.originalLanguage)],
        ["수록 앨범", book.albumTitle],
        ["재생시간", musicDuration(book.durationMillis)],
        [isBook ? "출간" : "공개", bookPublicationDate(book)],
        ["쪽수", book.pageCount],
        ["판형", book.bookSize],
        ["시리즈", book.seriesTitle],
        ["판 정보", book.edition],
        [isBook && !book.isbn.startsWith("google-books-") ? "ISBN" : "자료 ID", book.isbn]
    ].filter(([, value]) => value);
    const contents = plainText(book.tableOfContents);
    return (
        <section
            className="my-5 border-t border-stone-200 pt-4 font-suite text-xs leading-relaxed"
            aria-label="자료 정보"
        >
            <dl className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-2.5">
                {facts.map(([label, value]) => (
                    <div key={label} className="contents">
                        <dt className="text-stone-400">{label}</dt>
                        <dd className="m-0 break-words text-stone-600">{plainText(value)}</dd>
                    </div>
                ))}
            </dl>
            {book.sourceUrl &&
                /^https:\/\/(www\.themoviedb\.org|musicbrainz\.org|books\.google\.com)\//.test(
                    book.sourceUrl
                ) && (
                    <a
                        href={book.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block underline underline-offset-4"
                    >
                        {book.source === "TMDB"
                            ? "TMDB"
                            : book.source?.startsWith("MUSICBRAINZ")
                              ? "MusicBrainz"
                              : "Google Books"}
                        에서 원본 정보 보기 ↗
                    </a>
                )}
            {contents && (
                <details className="mt-4 border-t border-stone-100 pt-3 text-stone-600">
                    <summary className="cursor-pointer">목차 살펴보기</summary>
                    <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-line leading-loose">
                        {contents}
                    </p>
                </details>
            )}
        </section>
    );
}
