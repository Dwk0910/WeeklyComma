export type MediaType = "BOOK" | "MUSIC" | "TV" | "MOVIE";
export const MEDIA_LABELS: Record<MediaType, string> = {
    BOOK: "책",
    MUSIC: "음악",
    TV: "드라마·TV",
    MOVIE: "영화"
};

export type BookMetadata = {
    mediaType?: MediaType | null;
    source?: string | null;
    sourceId?: string | null;
    sourceUrl?: string | null;
    albumTitle?: string | null;
    durationMillis?: number | null;
    pageCount?: string | null;
    bookSize?: string | null;
    seriesTitle?: string | null;
    edition?: string | null;
    tableOfContents?: string | null;
    publicationDate?: string | null;
    pubDate?: number | null;
};

export function mediaLabel(book: BookMetadata) {
    if (book.mediaType === "MUSIC") return book.source === "MUSICBRAINZ_RECORDING" ? "곡" : "앨범";
    return MEDIA_LABELS[book.mediaType ?? "BOOK"];
}
export function musicDuration(milliseconds?: number | null) {
    if (!milliseconds || milliseconds <= 0) return "";
    const seconds = Math.floor(milliseconds / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
