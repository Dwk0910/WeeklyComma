import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { LoginRedirect } from "../component/RequireLogin.tsx";
import { api } from "../index.tsx";
import PageTitle from "../component/PageTitle.tsx";
import ServerImg from "../component/ServerImg.tsx";
import BookStarButton, { type BookStarStatus } from "../component/BookStarButton.tsx";
import { BoardFeedback } from "./boards/BoardShared.tsx";
import { plainText, type Recommendation } from "./recommendations/types.ts";

type Favorite = { book: Recommendation["book"]; starCount: number };
const PAGE_SIZE = 12;

export default function Favorites() {
    const [result, setResult] = useState<{
        status: "loading" | "success" | "error" | "unauthorized";
        items: Favorite[];
    }>({ status: "loading", items: [] });
    const [attempt, setAttempt] = useState(0);
    const [pending, setPending] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [announcement, setAnnouncement] = useState("");
    const requests = useRef(new Set<string>());
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const controller = new AbortController();
        api.get<Favorite[]>("books/starred", { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted) setResult({ status: "success", items: data });
            })
            .catch((error) => {
                if (!controller.signal.aborted)
                    setResult({
                        status:
                            isAxiosError(error) && error.response?.status === 401
                                ? "unauthorized"
                                : "error",
                        items: []
                    });
            });
        return () => controller.abort();
    }, [attempt]);

    const pageCount = Math.max(1, Math.ceil(result.items.length / PAGE_SIZE));
    const requestedPage = Number(searchParams.get("page") || 1);
    const page =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? Math.min(requestedPage, pageCount)
            : 1;
    const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
    const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);
    const visible = result.items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pageLink = (target: number) => `/favorites${target === 1 ? "" : `?page=${target}`}`;
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [page]);

    const remove = async (item: Favorite) => {
        const isbn = item.book.isbn;
        if (requests.current.has(isbn)) return;
        requests.current.add(isbn);
        setPending((previous) => ({ ...previous, [isbn]: true }));
        setErrors((previous) => ({ ...previous, [isbn]: "" }));
        try {
            await api.delete<BookStarStatus>(`books/${encodeURIComponent(isbn)}/star`);
            setResult((previous) => ({
                ...previous,
                items: previous.items.filter((entry) => entry.book.isbn !== isbn)
            }));
            setAnnouncement(`${plainText(item.book.title)}의 Star를 취소했습니다.`);
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 401) {
                setResult({ status: "unauthorized", items: [] });
            } else if (isAxiosError(error) && error.response?.status === 404) {
                setResult((previous) => ({
                    ...previous,
                    items: previous.items.filter((entry) => entry.book.isbn !== isbn)
                }));
                setAnnouncement("삭제된 도서를 즐겨찾기에서 정리했습니다.");
            } else {
                setErrors((previous) => ({
                    ...previous,
                    [isbn]: "Star를 취소하지 못했습니다. 다시 눌러 주세요."
                }));
            }
        } finally {
            requests.current.delete(isbn);
            setPending((previous) => ({ ...previous, [isbn]: false }));
        }
    };

    if (result.status === "unauthorized") {
        return <LoginRedirect />;
    }

    return (
        <main className="mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title="즐겨찾기" />
            <header className="mb-8 flex items-end justify-between gap-6">
                <div>
                    <h1 className="font-seoulnamsan text-3xl text-neutral-900">즐겨찾기</h1>
                    <p className="mt-3 text-sm text-neutral-500">
                        Star를 눌러 담아 둔 책들을 다시 만나보세요.
                    </p>
                </div>
                {result.status === "success" && (
                    <p className="text-sm text-neutral-500">
                        {result.items.length.toLocaleString("ko-KR")}권 · 제목순
                    </p>
                )}
            </header>
            <p className="sr-only" role="status">
                {announcement}
            </p>
            <div className="border-t border-neutral-800">
                {result.status !== "success" ? (
                    <BoardFeedback
                        title={
                            result.status === "loading"
                                ? "즐겨찾기를 불러오는 중입니다."
                                : "즐겨찾기를 불러오지 못했습니다."
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
                ) : result.items.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-neutral-600">아직 Star를 누른 책이 없습니다.</p>
                        <p className="mt-3 text-sm text-neutral-500">
                            마음에 드는 책에 Star를 눌러 나만의 책 목록을 만들어 보세요.
                        </p>
                        <Link
                            to="/recommendations"
                            className="mt-7 inline-block rounded-xs border border-neutral-300 px-6 py-2 text-sm hover:bg-neutral-50"
                        >
                            추천 책 둘러보기
                        </Link>
                    </div>
                ) : (
                    <ul className="grid grid-cols-2 gap-x-12" aria-label="내가 Star를 누른 책">
                        {visible.map((item) => {
                            const book = item.book;
                            const title = plainText(book.title);
                            const coverProps = {
                                alt: `${title} 표지`,
                                className: "h-42 w-28 shrink-0 object-cover shadow-sm",
                                loading: "lazy" as const
                            };
                            return (
                                <li
                                    key={book.isbn}
                                    className="flex items-center gap-6 border-b border-neutral-200 py-7"
                                >
                                    {book.customCoverImg ? (
                                        <ServerImg fileId={book.customCoverImg} {...coverProps} />
                                    ) : book.coverImg ? (
                                        <img src={book.coverImg} {...coverProps} />
                                    ) : (
                                        <div
                                            className="flex h-42 w-28 shrink-0 items-center justify-center bg-neutral-100 p-3 text-sm text-neutral-500"
                                            role="img"
                                            aria-label={`${title} 표지 없음`}
                                        >
                                            {title}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        {book.difficulty && (
                                            <span className="inline-block rounded-xs border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600">
                                                {book.difficulty}
                                            </span>
                                        )}
                                        <h2 className="mt-2 wrap-anywhere text-xl leading-relaxed text-neutral-900">
                                            {title}
                                        </h2>
                                        {book.subtitle && (
                                            <p className="mt-1 wrap-anywhere text-sm text-neutral-500">
                                                {plainText(book.subtitle)}
                                            </p>
                                        )}
                                        <p className="mt-3 wrap-anywhere text-sm text-neutral-500">
                                            {plainText(book.author)}
                                            {book.publisher && ` · ${plainText(book.publisher)}`}
                                        </p>
                                        <BookStarButton
                                            className="mt-3"
                                            title={title}
                                            status={{ starCount: item.starCount, starred: true }}
                                            pending={!!pending[book.isbn]}
                                            error={errors[book.isbn]}
                                            onToggle={() => void remove(item)}
                                            onRetry={() => void remove(item)}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
            {result.status === "success" && pageCount > 1 && (
                <nav
                    aria-label="즐겨찾기 목록 페이지"
                    className="mt-10 flex items-center justify-center gap-2 text-sm"
                >
                    {page > 1 && (
                        <Link className="px-3 py-2" to={pageLink(page - 1)}>
                            이전
                        </Link>
                    )}
                    {firstPage > 1 && (
                        <Link className="px-3 py-2" to={pageLink(1)}>
                            1
                        </Link>
                    )}
                    {firstPage > 2 && <span>…</span>}
                    {pages.map((target) => (
                        <Link
                            key={target}
                            to={pageLink(target)}
                            aria-label={`${target}페이지`}
                            aria-current={target === page ? "page" : undefined}
                            className={`rounded-xs px-3 py-2 ${target === page ? "bg-neutral-800 text-white" : "hover:bg-neutral-100"}`}
                        >
                            {target}
                        </Link>
                    ))}
                    {pages[pages.length - 1] < pageCount - 1 && <span>…</span>}
                    {pages[pages.length - 1] < pageCount && (
                        <Link className="px-3 py-2" to={pageLink(pageCount)}>
                            {pageCount}
                        </Link>
                    )}
                    {page < pageCount && (
                        <Link className="px-3 py-2" to={pageLink(page + 1)}>
                            다음
                        </Link>
                    )}
                </nav>
            )}
        </main>
    );
}
