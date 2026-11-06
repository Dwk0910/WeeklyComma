import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../index.tsx";
import PageTitle from "../../component/PageTitle.tsx";
import { BoardFeedback } from "../boards/BoardShared.tsx";
import { type Designation, type Recommendation, recommendationPath } from "./types.ts";
import { RecommendationRow } from "./RecommendationParts.tsx";
import { useBookStars } from "./useBookStars.ts";
import "./recommendations.css";

const PAGE_SIZE = 10;

export default function RecommendationList({ weekly = false }: { weekly?: boolean }) {
    const [result, setResult] = useState<{
        status: "loading" | "success" | "error";
        items: Recommendation[];
    }>({ status: "loading", items: [] });
    const [attempt, setAttempt] = useState(0);
    const [searchParams] = useSearchParams();
    const title = weekly ? "정기추천" : "일반추천";
    const path = recommendationPath(weekly);
    useEffect(() => {
        const controller = new AbortController();
        api.get<Recommendation[]>("recommendations", { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted) setResult({ status: "success", items: data });
            })
            .catch(() => {
                if (!controller.signal.aborted) setResult({ status: "error", items: [] });
            });
        return () => controller.abort();
    }, [attempt]);

    const entries: { item: Recommendation; issue?: Designation }[] = weekly
        ? result.items
              .flatMap((item) =>
                  item.recommendations
                      .filter((issue) => issue.postId === item.post.id)
                      .map((issue) => ({ item, issue }))
              )
              .sort(
                  (a, b) =>
                      b.issue.year - a.issue.year ||
                      b.issue.month - a.issue.month ||
                      b.issue.week - a.issue.week ||
                      ["상급", "중급", "초급"].indexOf(a.issue.difficulty) -
                          ["상급", "중급", "초급"].indexOf(b.issue.difficulty) ||
                      b.item.post.id - a.item.post.id
              )
        : result.items.map((item) => ({ item }));
    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    const requestedPage = Number(searchParams.get("page") || 1);
    const page =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? Math.min(requestedPage, pageCount)
            : 1;
    const visible = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const picks = weekly ? [] : result.items.filter((item) => item.post.isPinned);
    const stars = useBookStars([
        ...visible.map(({ item }) => item.book.isbn),
        ...picks.map((item) => item.book.isbn)
    ]);
    const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
    const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);
    const pageLink = (target: number) => `${path}${target === 1 ? "" : `?page=${target}`}`;
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page, weekly]);

    return (
        <main className={`recommendation-page ${weekly ? "recommendation-editorial" : ""}`}>
            <PageTitle title={title} />
            <header className="recommendation-heading">
                <div>
                    <h1>{title}</h1>
                    <p>
                        {weekly
                            ? "한 주의 쉼표가 되었던 책과 추천글을 만나보세요."
                            : "책을 읽은 저마다의 시선과 추천을 만나보세요."}
                    </p>
                </div>
            </header>
            {result.status !== "success" ? (
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
                                  setResult({ status: "loading", items: [] });
                                  setAttempt((value) => value + 1);
                              }
                            : undefined
                    }
                />
            ) : (
                <>
                    {picks.length > 0 && (
                        <section
                            className="recommendation-section"
                            aria-labelledby="curator-picks-title"
                        >
                            <div className="recommendation-section-heading">
                                <h2 id="curator-picks-title">쉼표지기의 픽</h2>
                                <p>쉼표지기가 골라 둔 추천글</p>
                            </div>
                            <div className="recommendation-rows">
                                {picks.map((item) => (
                                    <RecommendationRow
                                        key={item.post.id}
                                        item={item}
                                        weekly={false}
                                        stars={stars}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                    <section
                        className="recommendation-section"
                        aria-label={weekly ? "정기추천 글 목록" : "전체 추천글"}
                    >
                        {!weekly && (
                            <div className="recommendation-section-heading">
                                <h2>전체 추천글</h2>
                                <p>{entries.length.toLocaleString("ko-KR")}편 · 최신순</p>
                            </div>
                        )}
                        {visible.length === 0 ? (
                            <BoardFeedback
                                title={
                                    weekly
                                        ? "아직 정기추천 이력이 없습니다."
                                        : "아직 등록된 추천글이 없습니다."
                                }
                            />
                        ) : (
                            <div className="recommendation-rows">
                                {visible.map(({ item, issue }, index) => (
                                    <div
                                        key={`${item.post.id}-${issue?.year}-${issue?.month}-${issue?.week}-${issue?.difficulty}`}
                                    >
                                        {weekly && index === 1 && (
                                            <h2 className="recommendation-continuation">
                                                이어지는 책 이야기
                                            </h2>
                                        )}
                                        <RecommendationRow
                                            item={item}
                                            issue={issue}
                                            weekly={weekly}
                                            featured={weekly && index === 0}
                                            stars={stars}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    {pageCount > 1 && (
                        <nav
                            aria-label={`${title} 목록 페이지`}
                            className="recommendation-pagination"
                        >
                            {page > 1 && <Link to={pageLink(page - 1)}>이전</Link>}
                            {firstPage > 1 && <Link to={pageLink(1)}>1</Link>}
                            {firstPage > 2 && <span>…</span>}
                            {pages.map((target) => (
                                <Link
                                    key={target}
                                    to={pageLink(target)}
                                    aria-label={`${target}페이지`}
                                    aria-current={target === page ? "page" : undefined}
                                >
                                    {target}
                                </Link>
                            ))}
                            {pages[pages.length - 1] < pageCount - 1 && <span>…</span>}
                            {pages[pages.length - 1] < pageCount && (
                                <Link to={pageLink(pageCount)}>{pageCount}</Link>
                            )}
                            {page < pageCount && <Link to={pageLink(page + 1)}>다음</Link>}
                        </nav>
                    )}
                </>
            )}
        </main>
    );
}
