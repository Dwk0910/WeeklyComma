import type { BookMetadata } from "../../../types/book.ts";

export type Course = "low" | "mid" | "high";

export const COURSE_LABELS: Record<Course, string> = {
    low: "초급",
    mid: "중급",
    high: "상급"
};

export type RecommendationBook = BookMetadata & {
    title: string;
    subtitle: string;
    description: string;
    author: string;
    publisher: string;
    isbn: string;
    pubDate: number | null;
    coverImg: string;
    customCoverImg: string | null;
    adult: boolean;
    difficulty: "초급" | "중급" | "상급" | null;
};

export type RecommendationPost = {
    id: number;
    title: string;
    content: string;
    author: string;
    createdAt: number;
    attributions?: { bookId?: string };
};

export type RecommendationHistory = {
    id: number | null;
    recommendationYear: number;
    recommendationMonth: number;
    recommendationWeek: number;
    difficulty: string;
    isbn: string;
    recommendationPostId: number | null;
    recommendationPostTitle: string | null;
    book: RecommendationBook | null;
    current: boolean;
};

export type RecommendationSettings = {
    selections: { course: Course; isbn: string; postId: number | null }[];
    mainPick: Course | null;
};

export const plainText = (value: string | null | undefined) =>
    value
        ? new DOMParser().parseFromString(value, "text/html").documentElement.textContent || ""
        : "";
