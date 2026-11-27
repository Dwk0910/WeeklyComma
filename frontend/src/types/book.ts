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
    pageCount?: string | null;
    bookSize?: string | null;
    seriesTitle?: string | null;
    edition?: string | null;
    tableOfContents?: string | null;
    publicationDate?: string | null;
    pubDate?: number | null;
};
