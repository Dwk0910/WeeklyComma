import { type Post } from "../../types/post.ts";

export type Designation = {
    year: number;
    month: number;
    week: number;
    difficulty: string;
    postId: number | null;
    current: boolean;
};

export type Recommendation = {
    post: Post;
    book: {
        isbn: string;
        title: string;
        subtitle: string;
        author: string;
        publisher: string;
        difficulty: string;
        coverImg: string;
        customCoverImg: string | null;
    };
    starCount: number;
    recommendations: Designation[];
};

export const recommendationPath = (weekly: boolean) =>
    weekly ? "/weekly-recommendations" : "/recommendations";

export const designationLabel = (issue: Designation) =>
    `${issue.year}년 ${issue.month}월 ${issue.week}주차 추천 책`;

export function plainText(html: string) {
    const document = new DOMParser().parseFromString(html, "text/html");
    document.querySelectorAll("script,style").forEach((element) => element.remove());
    return document.body.textContent?.replace(/\s+/g, " ").trim() || "";
}

export function postSubtitle(html: string) {
    const document = new DOMParser().parseFromString(html, "text/html");
    const first = Array.from(document.querySelectorAll("p,h2,h3")).find((element) =>
        element.textContent?.trim()
    );
    const text = plainText(first?.innerHTML || html);
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}
