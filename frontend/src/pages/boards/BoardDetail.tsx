import { type BoardConfig } from "./boardConfig.ts";
import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { LuArrowLeft, LuArrowUp, LuArrowDown } from "react-icons/lu";
import { api } from "../../index.tsx";
import { type Post } from "../../types/post.ts";
import PostContent from "../../component/PostContent.tsx";
import PageTitle from "../../component/PageTitle.tsx";
import { PostDate, BoardFeedback, BoardHeading, PinnedPostBadge } from "./BoardShared.tsx";

export default function BoardDetail({ board }: { board: BoardConfig }) {
    const { id = "" } = useParams();
    return <BoardDetailContent key={`${board.postType}-${id}`} id={id} board={board} />;
}

function BoardDetailContent({ id, board }: { id: string; board: BoardConfig }) {
    const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
    const [result, setResult] = useState<{
        status: "loading" | "success" | "missing" | "error";
        post: Post | null;
    }>({ status: validId ? "loading" : "missing", post: null });
    const [neighbors, setNeighbors] = useState<{ posts: Post[]; error: boolean }>({
        posts: [],
        error: false
    });
    const [attempt, setAttempt] = useState(0);
    const location = useLocation();
    const state = location.state as { listSearch?: unknown } | null;
    const listSearch =
        typeof state?.listSearch === "string" && state.listSearch.startsWith("?")
            ? state.listSearch
            : "";
    const listPath = `${board.path}${listSearch}`;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    useEffect(() => {
        if (!validId) return;
        const controller = new AbortController();
        api.get<Post>(`posts/${id}`, { signal: controller.signal })
            .then(({ data }) => {
                if (!controller.signal.aborted) {
                    setResult(
                        data.type === board.postType
                            ? { status: "success", post: data }
                            : { status: "missing", post: null }
                    );
                }
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    setResult({
                        status:
                            isAxiosError(error) && error.response?.status === 404
                                ? "missing"
                                : "error",
                        post: null
                    });
                }
            });
        api.get<Post[]>("posts", {
            params: { postType: board.postType },
            signal: controller.signal
        })
            .then(({ data }) => {
                if (!controller.signal.aborted) {
                    setNeighbors({
                        posts: data
                            .filter((post) => post.type === board.postType)
                            .sort((a, b) => b.createdAt - a.createdAt || b.id - a.id),
                        error: false
                    });
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) setNeighbors({ posts: [], error: true });
            });
        return () => controller.abort();
    }, [id, validId, attempt, board.postType]);

    const retry = () => {
        setResult({ status: "loading", post: null });
        setNeighbors({ posts: [], error: false });
        setAttempt((previous) => previous + 1);
    };
    const selectedPost = result.post;
    const index = neighbors.posts.findIndex((post) => post.id === selectedPost?.id);
    const newer = index >= 0 ? neighbors.posts[index - 1] : undefined;
    const older = index >= 0 ? neighbors.posts[index + 1] : undefined;

    if (result.status === "missing") return <Navigate to="/404" replace />;

    return (
        <main className="mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle
                title={selectedPost ? `${selectedPost.title} · ${board.title}` : board.title}
            />
            <Link
                to={listPath}
                className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-500 underline-offset-4 hover:text-neutral-800 hover:underline"
            >
                <LuArrowLeft aria-hidden="true" />
                {board.title} 목록으로
            </Link>
            {selectedPost ? (
                <>
                    <article>
                        <header className="border-t-2 border-b border-t-neutral-800 border-b-neutral-200 py-8">
                            {selectedPost.isPinned && <PinnedPostBadge />}
                            <h1 className="mt-3 wrap-anywhere text-3xl leading-relaxed text-neutral-900">
                                {selectedPost.title}
                            </h1>
                            <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-neutral-500">
                                <div className="flex gap-2">
                                    <dt>글 번호</dt>
                                    <dd>{selectedPost.id}</dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt>작성자</dt>
                                    <dd>{selectedPost.author}</dd>
                                </div>
                                <div className="flex gap-2">
                                    <dt>등록일</dt>
                                    <dd>
                                        <PostDate timestamp={selectedPost.createdAt} />
                                    </dd>
                                </div>
                                {selectedPost.updatedAt > selectedPost.createdAt && (
                                    <div className="flex gap-2">
                                        <dt>수정일</dt>
                                        <dd>
                                            <PostDate timestamp={selectedPost.updatedAt} />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </header>
                        <div className="min-h-65 px-5 py-10 text-neutral-800">
                            <PostContent
                                key={`${selectedPost.id}-${selectedPost.updatedAt}`}
                                content={selectedPost.content}
                                ariaLabel={`${board.title} 본문`}
                            />
                        </div>
                    </article>
                    {index >= 0 && (
                        <nav
                            aria-label={`이전·다음 ${board.title}`}
                            className="border-t border-neutral-300 text-sm"
                        >
                            {[
                                { label: `이전 ${board.title}`, post: newer, Icon: LuArrowUp },
                                { label: `다음 ${board.title}`, post: older, Icon: LuArrowDown }
                            ].map(({ label, post, Icon }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-6 border-b border-neutral-200 px-5 py-5"
                                >
                                    <span className="flex w-24 shrink-0 items-center gap-2 text-neutral-500">
                                        <Icon aria-hidden="true" />
                                        {label}
                                    </span>
                                    {post ? (
                                        <Link
                                            to={`${board.path}/${post.id}`}
                                            state={{ listSearch }}
                                            className="min-w-0 flex-1 wrap-anywhere text-neutral-800 underline-offset-4 hover:underline"
                                        >
                                            {post.title}
                                        </Link>
                                    ) : (
                                        <span className="flex-1 text-neutral-400">
                                            {label}가 없습니다.
                                        </span>
                                    )}
                                    {post && (
                                        <span className="shrink-0 text-neutral-500">
                                            <PostDate timestamp={post.createdAt} />
                                        </span>
                                    )}
                                </div>
                            ))}
                        </nav>
                    )}
                    {neighbors.error && (
                        <BoardFeedback
                            title={`이전·다음 ${board.title} 목록을 불러오지 못했습니다.`}
                            error
                            onRetry={retry}
                        />
                    )}
                </>
            ) : (
                <>
                    <BoardHeading board={board} />
                    <div className="border-t-2 border-b border-t-neutral-800 border-b-neutral-200">
                        <BoardFeedback
                            title={
                                result.status === "loading"
                                    ? `${board.title} 글을 불러오는 중입니다.`
                                    : `${board.title} 글을 불러오지 못했습니다.`
                            }
                            error={result.status === "error"}
                            onRetry={result.status === "error" ? retry : undefined}
                        />
                    </div>
                </>
            )}
            {result.status !== "loading" && (
                <div className="mt-9 flex justify-center">
                    <Link
                        to={listPath}
                        className="rounded-xs border border-neutral-300 px-8 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                        목록으로
                    </Link>
                </div>
            )}
        </main>
    );
}
