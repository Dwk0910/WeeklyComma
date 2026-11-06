import { useEffect, useId, useState } from "react";
import { LuCircleHelp } from "react-icons/lu";
import { api } from "../../../index.tsx";
import ServerImg from "../../../component/ServerImg.tsx";
import {
    COURSE_LABELS,
    plainText,
    type Course,
    type RecommendationBook,
    type RecommendationHistory
} from "./types.ts";

export default function RecentRecommendations({
    isbn,
    course,
    onSelect,
    title = "최근에 추천한 책"
}: {
    isbn?: string;
    course?: Course;
    onSelect?: (book: RecommendationBook, postId: number | null) => void;
    title?: string;
}) {
    const helpId = useId();
    const [entries, setEntries] = useState<RecommendationHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(false);
            try {
                const response = await api.get<RecommendationHistory[]>("recommendation-history", {
                    params: { isbn, course, limit: 12 }
                });
                if (!cancelled) setEntries(response.data);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [isbn, course, retry]);

    return (
        <section className="font-suite" aria-label={title}>
            <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
            <p className="text-xs text-gray-500 mb-3">
                현재 선정과 지난 선정 이력을 최신순으로 표시합니다.
            </p>
            {loading ? (
                <p role="status" className="text-sm text-gray-400 py-5">
                    추천 이력을 불러오는 중입니다.
                </p>
            ) : error ? (
                <div role="alert" className="text-sm text-red-600 py-4">
                    추천 이력을 불러오지 못했습니다.
                    <button
                        type="button"
                        className="ml-2 underline"
                        onClick={() => setRetry((value) => value + 1)}
                    >
                        다시 시도
                    </button>
                </div>
            ) : entries.length === 0 ? (
                <p className="text-sm text-gray-400 py-5">아직 선정 이력이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => {
                        const book = entry.book;
                        const selectable =
                            !!book && (!course || book.difficulty === COURSE_LABELS[course]);
                        const content = (
                            <>
                                <div className="w-10 h-14 shrink-0 overflow-hidden rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                                    {book?.customCoverImg ? (
                                        <ServerImg
                                            fileId={book.customCoverImg}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : book?.coverImg ? (
                                        <img
                                            src={book.coverImg}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        "표지 없음"
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-sm break-words">
                                        {plainText(book?.title) || entry.isbn}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {entry.recommendationYear}년 {entry.recommendationMonth}월{" "}
                                        {entry.recommendationWeek}주차 · {entry.difficulty}
                                        {entry.current && (
                                            <span className="ml-2 text-blue-600 font-semibold">
                                                현재 선정
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 break-words">
                                        {entry.recommendationPostTitle ? (
                                            `추천글: ${plainText(entry.recommendationPostTitle)}`
                                        ) : (
                                            <span className="inline-flex items-center gap-1">
                                                연결된 추천글 없음
                                                <span
                                                    className="group/help relative inline-flex cursor-help items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
                                                    tabIndex={onSelect ? undefined : 0}
                                                    aria-label="연결된 추천글이 없는 이유"
                                                    aria-describedby={`${helpId}-${entry.id ?? entry.difficulty}`}
                                                >
                                                    <LuCircleHelp
                                                        size={13}
                                                        strokeWidth={1.5}
                                                        aria-hidden="true"
                                                    />
                                                    <span
                                                        id={`${helpId}-${entry.id ?? entry.difficulty}`}
                                                        role="tooltip"
                                                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-md bg-neutral-800 px-3 py-2 text-left text-xs leading-relaxed font-normal text-white shadow-sm group-hover/help:block group-focus/help:block group-focus-visible/recent:block"
                                                    >
                                                        이 책을 추천할 당시 추천글을 연결하지
                                                        않았거나, 연결했던 추천글이 삭제된
                                                        경우입니다.
                                                    </span>
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    {!book && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            삭제된 도서입니다. 선정 이력은 보존됩니다.
                                        </div>
                                    )}
                                    {onSelect && book && !selectable && (
                                        <div className="text-xs text-gray-400 mt-1">
                                            현재 도서의 난이도가 이 코스와 다릅니다.
                                        </div>
                                    )}
                                </div>
                            </>
                        );
                        const key = entry.current
                            ? `current-${entry.difficulty}-${entry.isbn}`
                            : `history-${entry.id}`;
                        return onSelect ? (
                            <button
                                key={key}
                                type="button"
                                disabled={!selectable}
                                onClick={() => book && onSelect(book, entry.recommendationPostId)}
                                className="group/recent w-full flex gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {content}
                            </button>
                        ) : (
                            <div
                                key={key}
                                className="flex gap-3 p-3 border border-gray-200 rounded-lg"
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
