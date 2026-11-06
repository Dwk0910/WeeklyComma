import { useCallback, useEffect, useRef, useState } from "react";
import { MdClose, MdSearch } from "react-icons/md";
import { api } from "../../../index.tsx";
import RecentRecommendations from "./RecentRecommendations.tsx";
import {
    COURSE_LABELS,
    plainText,
    type Course,
    type RecommendationBook,
    type RecommendationPost
} from "./types.ts";

export default function RecommendationPicker({
    course,
    initialBook,
    initialPostId,
    onClose,
    onSelect
}: {
    course: Course;
    initialBook?: RecommendationBook | null;
    initialPostId?: number;
    onClose: () => void;
    onSelect: (book: RecommendationBook, post: RecommendationPost) => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const postRequest = useRef(0);
    const searchRequest = useRef(0);
    const [tab, setTab] = useState<"recent" | "search">("recent");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<RecommendationBook[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [selectedBook, setSelectedBook] = useState<RecommendationBook | null>(
        initialBook || null
    );
    const [posts, setPosts] = useState<RecommendationPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<RecommendationPost | null>(null);
    const [loadingPosts, setLoadingPosts] = useState(!!initialBook);
    const [postError, setPostError] = useState("");

    const chooseBook = useCallback(
        async (book: RecommendationBook, preferredPostId: number | null = null) => {
            const request = ++postRequest.current;
            setSelectedBook(book);
            setSelectedPost(null);
            setPosts([]);
            setPostError("");
            setLoadingPosts(true);
            try {
                const response = await api.get<RecommendationPost[]>("posts", {
                    params: { postType: "G_RECOMMENDATION", bookId: book.isbn }
                });
                if (request !== postRequest.current) return;
                setPosts(response.data);
                setSelectedPost(response.data.find((post) => post.id === preferredPostId) || null);
            } catch {
                if (request === postRequest.current) setPostError("추천글을 불러오지 못했습니다.");
            } finally {
                if (request === postRequest.current) setLoadingPosts(false);
            }
        },
        []
    );

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => {
            dialog?.close();
            postRequest.current = -1;
            searchRequest.current = -1;
        };
    }, []);

    useEffect(() => {
        if (!initialBook) return;
        let cancelled = false;
        const request = ++postRequest.current;
        const load = async () => {
            try {
                const response = await api.get<RecommendationPost[]>("posts", {
                    params: { postType: "G_RECOMMENDATION", bookId: initialBook.isbn }
                });
                if (cancelled || request !== postRequest.current) return;
                setPosts(response.data);
                setSelectedPost(response.data.find((post) => post.id === initialPostId) || null);
            } catch {
                if (!cancelled && request === postRequest.current)
                    setPostError("추천글을 불러오지 못했습니다.");
            } finally {
                if (!cancelled && request === postRequest.current) setLoadingPosts(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [initialBook, initialPostId]);

    const search = async () => {
        if (!query.trim()) return;
        const request = ++searchRequest.current;
        setSearching(true);
        setSearched(true);
        setSearchError("");
        try {
            const response = await api.get<RecommendationBook[]>("books", {
                params: { query: query.trim() }
            });
            if (request === searchRequest.current) {
                setResults(
                    response.data.filter((book) => book.difficulty === COURSE_LABELS[course])
                );
            }
        } catch {
            if (request === searchRequest.current)
                setSearchError("도서를 검색하지 못했습니다. 다시 시도해 주세요.");
        } finally {
            if (request === searchRequest.current) setSearching(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="recommendation-picker-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            className="fixed inset-0 m-auto w-[min(1120px,calc(100vw-2rem))] max-w-none max-h-[90vh] rounded-xl p-0 shadow-2xl backdrop:bg-black/50 font-suite"
        >
            <div className="flex flex-col max-h-[90vh]">
                <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200">
                    <div>
                        <h3 id="recommendation-picker-title" className="text-xl font-bold">
                            {COURSE_LABELS[course]} 추천 도서 · 추천글 선택
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            책과 연결할 추천글을 함께 선택해 주세요. 작성 주차에 관계없이 선정할 수
                            있습니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="교체 창 닫기"
                        className="p-1 text-gray-400 hover:text-gray-700"
                    >
                        <MdClose size={24} />
                    </button>
                </header>
                <div className="grid md:grid-cols-2 min-h-0 overflow-y-auto md:overflow-hidden">
                    <section
                        aria-label="추천할 도서 선택"
                        className="p-5 md:overflow-y-auto md:max-h-[60vh] border-b md:border-b-0 md:border-r border-gray-200"
                    >
                        <div className="flex gap-2 mb-4" role="group" aria-label="도서 찾기 방법">
                            <button
                                type="button"
                                onClick={() => setTab("recent")}
                                aria-pressed={tab === "recent"}
                                className={`px-3 py-2 rounded-lg text-sm ${tab === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                            >
                                최근에 추천한 책
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab("search")}
                                aria-pressed={tab === "search"}
                                className={`px-3 py-2 rounded-lg text-sm ${tab === "search" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                            >
                                도서 검색
                            </button>
                        </div>
                        {tab === "recent" ? (
                            <RecentRecommendations
                                course={course}
                                onSelect={(book, postId) => void chooseBook(book, postId)}
                            />
                        ) : (
                            <>
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void search();
                                    }}
                                    className="flex gap-2 mb-4"
                                >
                                    <input
                                        aria-label="추천 도서 검색"
                                        autoComplete="off"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="책 제목 검색"
                                        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                    />
                                    <button
                                        type="submit"
                                        aria-label="도서 검색 실행"
                                        disabled={searching || !query.trim()}
                                        className="px-3 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50"
                                    >
                                        <MdSearch size={22} />
                                    </button>
                                </form>
                                <p className="text-xs text-gray-500 mb-3">
                                    {COURSE_LABELS[course]} 난이도의 등록된 도서만 표시합니다.
                                </p>
                                {searching ? (
                                    <p
                                        role="status"
                                        className="py-8 text-sm text-gray-400 text-center"
                                    >
                                        검색 중입니다.
                                    </p>
                                ) : searchError ? (
                                    <p role="alert" className="text-sm text-red-600 py-5">
                                        {searchError}
                                    </p>
                                ) : results.length ? (
                                    <div className="space-y-2">
                                        {results.map((book) => (
                                            <button
                                                key={book.isbn}
                                                type="button"
                                                onClick={() => void chooseBook(book)}
                                                aria-pressed={selectedBook?.isbn === book.isbn}
                                                className={`w-full p-4 text-left rounded-lg border ${selectedBook?.isbn === book.isbn ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                                            >
                                                <div className="font-bold text-gray-800">
                                                    {plainText(book.title)}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {plainText(book.author)} · {book.isbn}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-8 text-sm text-gray-400 text-center">
                                        {searched
                                            ? "검색 결과가 없습니다."
                                            : "제목으로 도서를 검색해 주세요."}
                                    </p>
                                )}
                            </>
                        )}
                    </section>
                    <section
                        aria-label="연결할 추천글 선택"
                        className="p-5 md:overflow-y-auto md:max-h-[60vh]"
                    >
                        {!selectedBook ? (
                            <div className="min-h-60 flex flex-col items-center justify-center text-center text-gray-400">
                                <h4 className="text-gray-600 font-semibold">
                                    먼저 추천할 책을 선택해 주세요.
                                </h4>
                                <p className="text-sm mt-2">
                                    선택한 책에 등록된 추천글을 여기에서 확인할 수 있습니다.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <div className="text-xs font-semibold text-blue-600 mb-1">
                                        선택한 도서
                                    </div>
                                    <h4 className="font-bold text-gray-900">
                                        {plainText(selectedBook.title)}
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {plainText(selectedBook.author)}
                                    </p>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-3">
                                    연결할 추천글 <span className="text-red-500 text-xs">필수</span>
                                </h4>
                                {loadingPosts ? (
                                    <p role="status" className="py-8 text-sm text-gray-400">
                                        추천글을 불러오는 중입니다.
                                    </p>
                                ) : postError ? (
                                    <div role="alert" className="text-sm text-red-600">
                                        {postError}
                                        <button
                                            type="button"
                                            className="ml-2 underline"
                                            onClick={() => void chooseBook(selectedBook)}
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : !posts.length ? (
                                    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                                        이 책에 등록된 추천글이 없습니다. 추천 책 관리에서 추천글을
                                        작성한 뒤 선정해 주세요.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {posts.map((post) => (
                                            <label
                                                key={post.id}
                                                className={`flex gap-3 p-4 border rounded-lg cursor-pointer ${selectedPost?.id === post.id ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-blue-300"}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="recommendation-post"
                                                    checked={selectedPost?.id === post.id}
                                                    onChange={() => setSelectedPost(post)}
                                                    className="mt-1"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block font-semibold text-sm">
                                                        {plainText(post.title)}
                                                    </span>
                                                    <span className="block text-xs text-gray-500 mt-1">
                                                        {post.author} ·{" "}
                                                        {new Date(
                                                            post.createdAt * 1000
                                                        ).toLocaleDateString("ko-KR")}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {selectedPost && (
                                    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
                                        <h5 className="text-xs font-bold text-gray-500 mb-2">
                                            추천글 미리보기
                                        </h5>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                            {plainText(selectedPost.content)}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
                <footer className="flex items-center justify-between gap-4 border-t border-gray-200 px-6 py-4">
                    <p className="text-xs text-gray-500">
                        선택을 확정한 뒤 관리 화면의 저장 버튼으로 적용합니다.
                    </p>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
                        >
                            취소
                        </button>
                        <button
                            type="button"
                            disabled={!selectedBook || !selectedPost || loadingPosts}
                            onClick={() =>
                                selectedBook && selectedPost && onSelect(selectedBook, selectedPost)
                            }
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            책과 추천글 선택
                        </button>
                    </div>
                </footer>
            </div>
        </dialog>
    );
}
