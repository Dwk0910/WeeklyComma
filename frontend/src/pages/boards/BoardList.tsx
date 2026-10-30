import { type BoardConfig } from "./boardConfig.ts";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import clsx from "clsx";
import { api } from "../../index.tsx";
import { type Post } from "../../types/post.ts";
import PageTitle from "../../component/PageTitle.tsx";
import { PostDate, BoardFeedback, BoardHeading, PinnedPostBadge } from "./BoardShared.tsx";

const PAGE_SIZE = 10;

export default function BoardList({ board }: { board: BoardConfig }) {
    const [result, setResult] = useState<{
        status: "loading" | "success" | "error";
        posts: Post[];
    }>({ status: "loading", posts: [] });
    const [attempt, setAttempt] = useState(0);
    const [searchParams] = useSearchParams();
    const location = useLocation();

    useEffect(() => {
        const controller = new AbortController();
        api.get<Post[]>("posts", {
            params: { postType: board.postType },
            signal: controller.signal
        })
            .then(({ data }) => {
                if (!controller.signal.aborted) {
                    setResult({
                        status: "success",
                        posts: data.filter((post) => post.type === board.postType)
                    });
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) setResult({ status: "error", posts: [] });
            });
        return () => controller.abort();
    }, [attempt, board.postType]);

    const sortedPosts = [...result.posts].sort(
        (a, b) =>
            Number(b.isPinned) - Number(a.isPinned) || b.createdAt - a.createdAt || b.id - a.id
    );
    const pageCount = Math.max(1, Math.ceil(sortedPosts.length / PAGE_SIZE));
    const requestedPage = Number(searchParams.get("page") || 1);
    const page =
        Number.isInteger(requestedPage) && requestedPage > 0
            ? Math.min(requestedPage, pageCount)
            : 1;
    const visiblePosts = sortedPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
    const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    const retry = () => {
        setResult({ status: "loading", posts: [] });
        setAttempt((previous) => previous + 1);
    };

    const pageLink = (target: number) => `${board.path}${target === 1 ? "" : `?page=${target}`}`;

    return (
        <main className="mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title={board.title} />
            <BoardHeading
                board={board}
                count={result.status === "success" ? sortedPosts.length : undefined}
            />
            <table className="w-full table-fixed border-t-2 border-neutral-800">
                <caption className="sr-only">
                    주간쉼표 {board.title} 목록. 고정 글을 먼저 표시합니다.
                </caption>
                <thead>
                    <tr className="border-b border-neutral-200 text-sm font-normal text-neutral-500">
                        <th scope="col" className="w-20 px-3 py-4 font-normal">
                            글 번호
                        </th>
                        <th scope="col" className="px-5 py-4 text-left font-normal">
                            제목
                        </th>
                        <th scope="col" className="w-32 px-3 py-4 font-normal">
                            작성자
                        </th>
                        <th scope="col" className="w-36 px-3 py-4 font-normal">
                            등록일
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {result.status !== "success" || sortedPosts.length === 0 ? (
                        <tr className="border-b border-neutral-200">
                            <td colSpan={4}>
                                <BoardFeedback
                                    title={
                                        result.status === "loading"
                                            ? `${board.title} 목록을 불러오는 중입니다.`
                                            : result.status === "error"
                                              ? `${board.title} 목록을 불러오지 못했습니다.`
                                              : `등록된 ${board.title} 글이 없습니다.`
                                    }
                                    error={result.status === "error"}
                                    onRetry={result.status === "error" ? retry : undefined}
                                />
                            </td>
                        </tr>
                    ) : (
                        visiblePosts.map((post) => (
                            <tr
                                key={post.id}
                                className={clsx(
                                    "border-b border-neutral-200 transition-colors hover:bg-neutral-50",
                                    post.isPinned && "bg-red-50/60"
                                )}
                            >
                                <td className="px-3 py-5 text-center text-sm text-neutral-500">
                                    {post.id}
                                </td>
                                <td className="px-5 py-5">
                                    <div className="flex items-center gap-3">
                                        {post.isPinned && <PinnedPostBadge />}
                                        <Link
                                            to={`${board.path}/${post.id}`}
                                            state={{ listSearch: location.search }}
                                            className="min-w-0 wrap-anywhere text-base text-neutral-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                                        >
                                            {post.title}
                                        </Link>
                                    </div>
                                </td>
                                <td className="wrap-anywhere px-3 py-5 text-center text-sm text-neutral-500">
                                    {post.author}
                                </td>
                                <td className="px-3 py-5 text-center text-sm text-neutral-500">
                                    <PostDate timestamp={post.createdAt} />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            {result.status === "success" && sortedPosts.length > 0 && (
                <p className="mt-5 text-xs text-neutral-500">
                    고정 글은 목록 맨 위에서 확인하실 수 있습니다.
                </p>
            )}
            {result.status === "success" && pageCount > 1 && (
                <nav
                    aria-label={`${board.title} 목록 페이지`}
                    className="mt-10 flex items-center justify-center gap-2 text-sm"
                >
                    {page > 1 ? (
                        <Link
                            to={pageLink(page - 1)}
                            aria-label="이전 페이지"
                            className="mr-3 flex items-center gap-1 px-2 py-2 text-neutral-600 hover:text-neutral-950"
                        >
                            <LuChevronLeft aria-hidden="true" />
                            이전
                        </Link>
                    ) : (
                        <span
                            aria-disabled="true"
                            className="mr-3 flex items-center gap-1 px-2 py-2 text-neutral-300"
                        >
                            <LuChevronLeft aria-hidden="true" />
                            이전
                        </span>
                    )}
                    {firstPage > 1 && (
                        <Link to={pageLink(1)} aria-label="1페이지" className="px-3 py-2">
                            1
                        </Link>
                    )}
                    {firstPage > 2 && <span className="text-neutral-400">…</span>}
                    {pages.map((target) => (
                        <Link
                            key={target}
                            to={pageLink(target)}
                            aria-label={`${target}페이지`}
                            aria-current={target === page ? "page" : undefined}
                            className={clsx(
                                "min-w-9 rounded-xs px-3 py-2 text-center transition-colors",
                                target === page
                                    ? "bg-neutral-800 text-white"
                                    : "text-neutral-500 hover:bg-neutral-100"
                            )}
                        >
                            {target}
                        </Link>
                    ))}
                    {pages[pages.length - 1] < pageCount - 1 && (
                        <span className="text-neutral-400">…</span>
                    )}
                    {pages[pages.length - 1] < pageCount && (
                        <Link
                            to={pageLink(pageCount)}
                            aria-label={`${pageCount}페이지`}
                            className="px-3 py-2"
                        >
                            {pageCount}
                        </Link>
                    )}
                    {page < pageCount ? (
                        <Link
                            to={pageLink(page + 1)}
                            aria-label="다음 페이지"
                            className="ml-3 flex items-center gap-1 px-2 py-2 text-neutral-600 hover:text-neutral-950"
                        >
                            다음
                            <LuChevronRight aria-hidden="true" />
                        </Link>
                    ) : (
                        <span
                            aria-disabled="true"
                            className="ml-3 flex items-center gap-1 px-2 py-2 text-neutral-300"
                        >
                            다음
                            <LuChevronRight aria-hidden="true" />
                        </span>
                    )}
                </nav>
            )}
        </main>
    );
}
