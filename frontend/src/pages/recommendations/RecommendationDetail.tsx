import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import { api } from "../../index.tsx";
import PageTitle from "../../component/PageTitle.tsx";
import PostContent from "../../component/PostContent.tsx";
import { BoardFeedback } from "../boards/BoardShared.tsx";
import {
    BookCover,
    BookInfo,
    PostMeta,
    RecommendationStars,
    RecommendationTags
} from "./RecommendationParts.tsx";
import { type Recommendation, designationLabel, recommendationPath } from "./types.ts";
import { useBookStars } from "./useBookStars.ts";
import "./recommendations.css";

export default function RecommendationDetail({ weekly = false }: { weekly?: boolean }) {
    const { id = "" } = useParams();
    return <Detail key={`${weekly}-${id}`} id={id} weekly={weekly} />;
}

function Detail({ id, weekly }: { id: string; weekly: boolean }) {
    const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
    const [result, setResult] = useState<{
        status: "loading" | "success" | "error" | "missing";
        item: Recommendation | null;
    }>({ status: validId ? "loading" : "missing", item: null });
    const [attempt, setAttempt] = useState(0);
    const location = useLocation();
    const state = location.state as { listSearch?: unknown } | null;
    const listSearch =
        typeof state?.listSearch === "string" && state.listSearch.startsWith("?")
            ? state.listSearch
            : "";
    const path = `${recommendationPath(weekly)}${listSearch}`;
    const title = weekly ? "정기추천" : "일반추천";
    const item = result.item;
    const issueParams = new URLSearchParams(location.search);
    const hasIssue = ["year", "month", "week", "course"].some((key) => issueParams.has(key));
    const issue = weekly
        ? item?.recommendations.find(
              (candidate) =>
                  candidate.postId === item.post.id &&
                  (!hasIssue ||
                      (String(candidate.year) === issueParams.get("year") &&
                          String(candidate.month) === issueParams.get("month") &&
                          String(candidate.week) === issueParams.get("week") &&
                          candidate.difficulty === issueParams.get("course")))
          )
        : undefined;
    const stars = useBookStars(item ? [item.book.isbn] : []);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    useEffect(() => {
        if (!validId) return;
        const controller = new AbortController();
        api.get<Recommendation>(`recommendations/${id}`, { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted)
                    setResult(
                        weekly &&
                            !data.recommendations.some((issue) => issue.postId === data.post.id)
                            ? { status: "missing", item: null }
                            : { status: "success", item: data }
                    );
            })
            .catch((error) => {
                if (!controller.signal.aborted)
                    setResult({
                        status:
                            isAxiosError(error) && error.response?.status === 404
                                ? "missing"
                                : "error",
                        item: null
                    });
            });
        return () => controller.abort();
    }, [id, validId, weekly, attempt]);
    if (result.status === "missing" || (weekly && item && !issue))
        return <Navigate to="/404" replace />;
    return (
        <main className={`recommendation-page ${weekly ? "recommendation-editorial" : ""}`}>
            <PageTitle title={item ? `${item.post.title} · ${title}` : title} />
            <Link to={path} className="recommendation-back">
                <LuArrowLeft aria-hidden="true" />
                {title} 목록으로
            </Link>
            {item ? (
                <>
                    <article>
                        <header className="recommendation-detail-heading">
                            <RecommendationTags item={item} issue={issue} />
                            <h1>{item.post.title}</h1>
                            <PostMeta item={item} />
                        </header>
                        <div className="recommendation-reading">
                            <aside
                                className="recommendation-book-aside"
                                aria-label="추천 도서 정보"
                            >
                                <BookCover item={item} />
                                <BookInfo item={item} />
                                <RecommendationStars item={item} stars={stars} />
                                {item.recommendations.length > 0 && (
                                    <details className="recommendation-history">
                                        <summary>
                                            정기추천 이력{" "}
                                            {item.recommendations.length.toLocaleString("ko-KR")}건
                                        </summary>
                                        <ul>
                                            {item.recommendations.map((issue, index) => (
                                                <li key={index}>
                                                    {designationLabel(issue)} · {issue.difficulty}
                                                    {issue.current ? " · 현재 선정" : ""}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </aside>
                            <div className="recommendation-body">
                                <PostContent
                                    content={item.post.content}
                                    ariaLabel={`${title} 본문`}
                                />
                            </div>
                        </div>
                    </article>
                    <div className="recommendation-detail-end">
                        <Link to={path}>목록으로</Link>
                    </div>
                </>
            ) : (
                <BoardFeedback
                    title={
                        result.status === "loading"
                            ? "추천글을 불러오는 중입니다."
                            : "추천글을 불러오지 못했습니다."
                    }
                    error={result.status === "error"}
                    onRetry={
                        result.status === "error"
                            ? () => {
                                  setResult({ status: "loading", item: null });
                                  setAttempt((value) => value + 1);
                              }
                            : undefined
                    }
                />
            )}
        </main>
    );
}
