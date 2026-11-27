import { Link, useLocation } from "react-router-dom";
import { MEDIA_LABELS } from "../../types/book.ts";
import BookCoverImage from "../../component/BookCoverImage.tsx";
import BookStarButton from "../../component/BookStarButton.tsx";
import { PostDate } from "../boards/BoardShared.tsx";
import {
    type Designation,
    type Recommendation,
    designationLabel,
    plainText,
    postSubtitle,
    recommendationPath
} from "./types.ts";
import { type useBookStars } from "./useBookStars.ts";

export type Stars = ReturnType<typeof useBookStars>;

export function BookCover({ item, className = "" }: { item: Recommendation; className?: string }) {
    return (
        <BookCoverImage
            book={{ ...item.book, title: plainText(item.book.title) }}
            className={`recommendation-cover ${className}`}
        />
    );
}

export function RecommendationTags({ item, issue }: { item: Recommendation; issue?: Designation }) {
    const latest = issue || item.recommendations[0];
    const difficulty = issue?.difficulty || item.book.difficulty;
    return (
        <div className="recommendation-tags">
            <span className="recommendation-designation">
                {MEDIA_LABELS[item.book.mediaType ?? "BOOK"]}
            </span>
            {difficulty && <span className="recommendation-difficulty">{difficulty}</span>}
            {latest && (
                <span className="recommendation-designation">{designationLabel(latest)}</span>
            )}
        </div>
    );
}

export function RecommendationStars({ item, stars }: { item: Recommendation; stars: Stars }) {
    const isbn = item.book.isbn;
    return (
        <BookStarButton
            title={plainText(item.book.title)}
            status={stars.statuses[isbn]}
            fallbackCount={item.starCount}
            pending={!!stars.pending[isbn]}
            error={stars.errors[isbn]}
            onToggle={() => void stars.toggle(isbn)}
            onRetry={() => void stars.load(isbn)}
        />
    );
}

export function PostMeta({ item }: { item: Recommendation }) {
    return (
        <div className="recommendation-meta">
            <span>{item.post.author}</span>
            <span aria-hidden="true">·</span>
            <PostDate timestamp={item.post.createdAt} />
        </div>
    );
}

export function BookInfo({ item }: { item: Recommendation }) {
    return (
        <p className="recommendation-book-info">
            <span>{plainText(item.book.title)}</span>
            {item.book.author && <span> · {plainText(item.book.author)}</span>}
            {item.book.publisher && <span> · {plainText(item.book.publisher)}</span>}
        </p>
    );
}

export function RecommendationRow({
    item,
    weekly,
    stars,
    issue,
    featured = false
}: {
    item: Recommendation;
    weekly: boolean;
    stars: Stars;
    issue?: Designation;
    featured?: boolean;
}) {
    const location = useLocation();
    const subtitle = postSubtitle(item.post.content);
    const issueQuery = issue
        ? `?${new URLSearchParams({ year: String(issue.year), month: String(issue.month), week: String(issue.week), course: issue.difficulty })}`
        : "";
    return (
        <article
            className={`recommendation-row ${weekly ? "recommendation-editorial-row" : ""} ${featured ? "recommendation-feature" : ""}`}
        >
            <BookCover item={item} />
            <div className="recommendation-row-copy">
                <RecommendationTags item={item} issue={issue} />
                <h2>
                    <Link
                        to={`${recommendationPath(weekly)}/${item.post.id}${issueQuery}`}
                        state={{ listSearch: location.search }}
                    >
                        {item.post.title}
                    </Link>
                </h2>
                <PostMeta item={item} />
                {subtitle && <p className="recommendation-subtitle">{subtitle}</p>}
                <BookInfo item={item} />
                <RecommendationStars item={item} stars={stars} />
            </div>
        </article>
    );
}
