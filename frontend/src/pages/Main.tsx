import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { MdPause, MdPlayArrow, MdArrowForwardIos, MdArrowBackIosNew } from "react-icons/md";
import { useCallback, useEffect, useState, useRef } from "react";

import { api } from "../lib/api.ts";
import { getLSdata } from "../lib/session.ts";
import { isAxiosError } from "axios";
import BookStarButton, { type BookStarStatus } from "../component/BookStarButton.tsx";
import ServerImg from "../component/ServerImg.tsx";
import HomeBanner, { BannerSkeleton } from "../component/HomeBanner.tsx";
import {
    initialCourse,
    registeredCourses,
    recommendationCourses,
    type HomeCourse,
    type HomeSelection,
    type HomeSelections
} from "../lib/homeRecommendations.ts";

import clsx from "clsx";
import { Link } from "react-router-dom";
import { type Post } from "../types/post.ts";

type BannerItem = { id?: string; linkUrl?: string };

type CurrentWeekResponse = {
    year: number;
    month: number;
    week: number;
    monthLabel: string;
    weekLabel: string;
};

type RecommendationPost = {
    id: number;
    title: string;
    author: string;
    createdAt: number;
    content: string;
    attributions?: {
        bookId?: string;
    };
};

type BookResponse = {
    title: string;
    subtitle: string;
    author: string;
    publisher: string;
    isbn: string;
    pubDate: number;
    coverImg: string;
    customCoverImg: string | null;
    description: string;
    difficulty: string;
    adult: boolean;
};

type PopularBook = Pick<BookResponse, "isbn" | "title" | "coverImg" | "customCoverImg"> & {
    starCount: number;
};

type BannerStatus = "loading" | "ready" | "error";

async function readHomeSetting(key: string, signal?: AbortSignal): Promise<string | null> {
    const response = await api.get("adminsettings", { params: { key }, signal });
    return response.data == null || response.data === "" ? null : String(response.data);
}

function BannerPlaceholder({ status, emptyText }: { status: BannerStatus; emptyText: string }) {
    return status === "loading" ? (
        <BannerSkeleton />
    ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            {status === "error" ? "배너를 불러오지 못했습니다." : emptyText}
        </div>
    );
}

const decodeHtml = (value: string | null | undefined) => {
    if (!value) return "";
    return new DOMParser().parseFromString(value, "text/html").documentElement.textContent || "";
};

export default function Main() {
    const [latestNotice, setLatestNotice] = useState<Pick<Post, "id" | "title"> | null>(null);
    const [currentWeek, setCurrentWeek] = useState<CurrentWeekResponse | null>(null);
    const [selectedRecommendationLevel, setSelectedRecommendationLevel] =
        useState<HomeCourse | null>(null);
    const [selections, setSelections] = useState<HomeSelections>({});
    const recommendationRequest = useRef(0);
    const nextRecommendationRequest = useCallback(() => ++recommendationRequest.current, []);
    const availableCourses = registeredCourses(selections);
    const [recommendationBook, setRecommendationBook] = useState<BookResponse | null>(null);
    const [recommendationPost, setRecommendationPost] = useState<RecommendationPost | null>(null);
    const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);

    const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
    const [isPopularLoading, setIsPopularLoading] = useState(true);
    const [popularError, setPopularError] = useState(false);
    const popularRequest = useRef(0);
    const [bookStars, setBookStars] = useState<Record<string, BookStarStatus>>({});
    const [pendingStars, setPendingStars] = useState<Record<string, boolean>>({});
    const [starErrors, setStarErrors] = useState<Record<string, string>>({});
    const starVersions = useRef<Record<string, number>>({});
    const starRequests = useRef(new Set<string>());

    const loadPopularBooks = useCallback(() => {
        const request = ++popularRequest.current;
        return api
            .get<PopularBook[]>("books/popular", { params: { limit: 6 } })
            .then((response) => {
                if (request !== popularRequest.current) return;
                setPopularBooks(response.data);
                setPopularError(false);
            })
            .catch(() => {
                if (request === popularRequest.current) setPopularError(true);
            })
            .finally(() => {
                if (request === popularRequest.current) setIsPopularLoading(false);
            });
    }, []);

    useEffect(() => {
        void loadPopularBooks();
        return () => {
            popularRequest.current = -1;
        };
    }, [loadPopularBooks]);

    const loadStarStatus = useCallback((isbn: string, signal?: AbortSignal) => {
        const version = starVersions.current[isbn] || 0;
        return api
            .get<BookStarStatus>(`books/${encodeURIComponent(isbn)}/star`, { signal })
            .then((response) => {
                if (signal?.aborted || version !== (starVersions.current[isbn] || 0)) return;
                setBookStars((previous) => ({ ...previous, [isbn]: response.data }));
                setStarErrors((previous) => ({ ...previous, [isbn]: "" }));
            })
            .catch(() => {
                if (!signal?.aborted && version === (starVersions.current[isbn] || 0)) {
                    setStarErrors((previous) => ({
                        ...previous,
                        [isbn]: "책갈피 정보를 불러오지 못했습니다."
                    }));
                }
            });
    }, []);

    const visibleStarIsbns = [
        ...new Set([
            ...popularBooks.map((book) => book.isbn),
            ...(recommendationBook ? [recommendationBook.isbn] : [])
        ])
    ]
        .sort()
        .join("|");

    useEffect(() => {
        const controller = new AbortController();
        for (const isbn of visibleStarIsbns.split("|").filter(Boolean))
            void loadStarStatus(isbn, controller.signal);
        return () => controller.abort();
    }, [visibleStarIsbns, loadStarStatus]);

    const toggleStar = async (isbn: string) => {
        if (!getLSdata()) {
            setStarErrors((previous) => ({
                ...previous,
                [isbn]: "책갈피를 꽂으려면 상단에서 로그인해 주세요."
            }));
            return;
        }
        const status = bookStars[isbn];
        if (!status || starRequests.current.has(isbn)) return;
        starRequests.current.add(isbn);
        starVersions.current[isbn] = (starVersions.current[isbn] || 0) + 1;
        setPendingStars((previous) => ({ ...previous, [isbn]: true }));
        setStarErrors((previous) => ({ ...previous, [isbn]: "" }));
        try {
            const path = `books/${encodeURIComponent(isbn)}/star`;
            const response = status.starred
                ? await api.delete<BookStarStatus>(path)
                : await api.put<BookStarStatus>(path);
            setBookStars((previous) => ({ ...previous, [isbn]: response.data }));
            setPopularBooks((previous) =>
                previous
                    .map((book) =>
                        book.isbn === isbn ? { ...book, starCount: response.data.starCount } : book
                    )
                    .filter((book) => book.starCount > 10)
                    .sort((a, b) => b.starCount - a.starCount || a.isbn.localeCompare(b.isbn))
            );
            void loadPopularBooks();
        } catch (error) {
            const message =
                isAxiosError(error) && error.response?.status === 401
                    ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
                    : "책갈피를 변경하지 못했습니다. 다시 눌러 주세요.";
            setStarErrors((previous) => ({ ...previous, [isbn]: message }));
        } finally {
            starRequests.current.delete(isbn);
            setPendingStars((previous) => ({ ...previous, [isbn]: false }));
        }
    };

    const [mainBanners, setMainBanners] = useState<BannerItem[]>([]); // 좌측 메인 배너(슬라이드)
    const [topRightBanners, setTopRightBanners] = useState<BannerItem[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<BannerItem[]>([]);

    const [bannerStatuses, setBannerStatuses] = useState<Record<string, BannerStatus>>({
        leftBanner: "loading",
        topRightBanners: "loading",
        bottomRightBanners: "loading"
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const intervalRef = useRef<number | null>(null);

    const parseBannerData = (rawString: string | null): BannerItem[] => {
        if (!rawString) return [];
        return rawString
            .split(",")
            .filter((item) => item.split("|")[0].trim())
            .map((item) => {
                const [id, linkUrl] = item.split("|");
                return { id, linkUrl: linkUrl || "" };
            });
    };

    const loadRecommendation = useCallback(
        async (selection: HomeSelection, signal?: AbortSignal) => {
            const request = nextRecommendationRequest();
            setIsRecommendationLoading(true);
            setRecommendationBook(null);
            setRecommendationPost(null);
            const [book, post] = await Promise.allSettled([
                api.get<BookResponse>(`books/${encodeURIComponent(selection.isbn)}`, { signal }),
                selection.postId
                    ? api.get<RecommendationPost>(`posts/${encodeURIComponent(selection.postId)}`, {
                          signal
                      })
                    : Promise.resolve(null)
            ]);
            if (signal?.aborted || request !== recommendationRequest.current) return;
            if (book.status === "fulfilled") setRecommendationBook(book.value.data);
            if (
                post.status === "fulfilled" &&
                post.value?.data.attributions?.bookId === selection.isbn
            ) {
                setRecommendationPost(post.value.data);
            }
            setIsRecommendationLoading(false);
        },
        [nextRecommendationRequest]
    );

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;
        void api
            .get<Post>("posts/latestnotice", { signal })
            .then((response) => {
                if (!signal.aborted && response.data?.title) setLatestNotice(response.data);
            })
            .catch(() => {});
        void api
            .get<CurrentWeekResponse>("current-week", { signal })
            .then((response) => {
                if (!signal.aborted) setCurrentWeek(response.data);
            })
            .catch(() => {});

        const bannerSlots = [
            { key: "leftBanner", set: setMainBanners, random: false },
            { key: "topRightBanners", set: setTopRightBanners, random: true },
            { key: "bottomRightBanners", set: setBottomRightBanners, random: true }
        ];
        for (const slot of bannerSlots) {
            void readHomeSetting(slot.key, signal)
                .then((value) => {
                    if (signal.aborted) return;
                    const banners = parseBannerData(value);
                    slot.set(
                        slot.random && banners.length
                            ? [banners[Math.floor(Math.random() * banners.length)]]
                            : banners
                    );
                    setBannerStatuses((previous) => ({ ...previous, [slot.key]: "ready" }));
                })
                .catch(() => {
                    if (!signal.aborted)
                        setBannerStatuses((previous) => ({ ...previous, [slot.key]: "error" }));
                });
        }

        void (async () => {
            try {
                const [mainPick, courses] = await Promise.all([
                    readHomeSetting("mainPick", signal),
                    Promise.all(
                        recommendationCourses.map(async ({ key }) => {
                            const [isbn, postId] = await Promise.all([
                                readHomeSetting(`recommend_isbn_${key}`, signal),
                                readHomeSetting(`recommend_post_${key}`, signal)
                            ]);
                            return [
                                key,
                                isbn?.trim() ? { isbn: isbn.trim(), postId } : undefined
                            ] as const;
                        })
                    )
                ]);
                if (signal.aborted) return;
                const nextSelections: HomeSelections = Object.fromEntries(courses);
                const selected = initialCourse(nextSelections, mainPick);
                setSelections(nextSelections);
                setSelectedRecommendationLevel(selected);
                if (selected && nextSelections[selected]) {
                    await loadRecommendation(nextSelections[selected], signal);
                } else {
                    setIsRecommendationLoading(false);
                }
            } catch (error) {
                if (!signal.aborted) {
                    console.error("추천 설정 조회 실패:", error);
                    setIsRecommendationLoading(false);
                }
            }
        })();
        return () => {
            controller.abort();
            nextRecommendationRequest();
        };
    }, [loadRecommendation, nextRecommendationRequest]);

    const handleRecommendationLevelChange = (level: HomeCourse) => {
        const selection = selections[level];
        if (!selection || level === selectedRecommendationLevel) return;
        setSelectedRecommendationLevel(level);
        void loadRecommendation(selection);
    };

    // autoplay
    useEffect(() => {
        if (!isPlaying || mainBanners.length <= 1) return;

        intervalRef.current = window.setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
        }, 10000);

        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [isPlaying, mainBanners]);

    const goPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + mainBanners.length) % mainBanners.length);
    };
    const goNext = () => {
        setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    };

    return (
        <div className={"mx-5 my-5"}>
            {/* Top notice */}
            <div className={"flex"}>
                {/* Left column: notice header + main banner (original layout widths) */}
                <div className={"flex flex-col"}>
                    <div className={"w-215 h-10 flex items-center border-b border-gray-200 pb-2"}>
                        <span
                            className={
                                "w-15 h-8 flex items-center rounded-lg justify-center bg-red-400 text-white font-suite"
                            }
                        >
                            공지
                        </span>
                        {latestNotice ? (
                            <Link
                                to={`/notices/${latestNotice.id}`}
                                className="ml-3 font-suite text-[1.1rem] font-bold underline-offset-4 hover:underline"
                            >
                                {latestNotice.title}
                            </Link>
                        ) : (
                            <span className="ml-3 font-suite text-[1.1rem] font-bold">
                                공지사항이 없습니다.
                            </span>
                        )}
                    </div>

                    <div className={"w-215 h-100 rounded-lg mt-5 overflow-hidden"}>
                        {/* Carousel rendered inside original-sized container */}
                        <div className={"relative w-full h-full"}>
                            {mainBanners.length === 0 ? (
                                <BannerPlaceholder
                                    status={bannerStatuses.leftBanner}
                                    emptyText="배너가 없습니다."
                                />
                            ) : (
                                mainBanners.map((b, i) => (
                                    <a
                                        key={b.id || i}
                                        href={b.linkUrl || "#"}
                                        className={`absolute inset-0 transition-opacity duration-500 ${i === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                    >
                                        {b.id ? (
                                            <HomeBanner fileId={b.id} alt={`main-banner-${i}`} />
                                        ) : (
                                            <div
                                                className={
                                                    "w-full h-full flex items-center justify-center text-gray-400"
                                                }
                                            >
                                                이미지 없음
                                            </div>
                                        )}
                                    </a>
                                ))
                            )}

                            {/* Controls (오른쪽 아래) */}
                            {mainBanners.length > 1 && (
                                <div
                                    className={
                                        "absolute bottom-3 right-3 flex items-center gap-2 bg-black/30 rounded-md p-1"
                                    }
                                >
                                    <button
                                        onClick={() => setIsPlaying((p) => !p)}
                                        className={"text-white p-1 rounded hover:bg-white/10"}
                                        title={isPlaying ? "일시정지" : "재생"}
                                    >
                                        {isPlaying ? <MdPause /> : <MdPlayArrow />}
                                    </button>
                                    <button
                                        onClick={goPrev}
                                        className={"text-white p-1 rounded hover:bg-white/10"}
                                        title="이전"
                                    >
                                        <MdArrowBackIosNew />
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className={"text-white p-1 rounded hover:bg-white/10"}
                                        title="다음"
                                    >
                                        <MdArrowForwardIos />
                                    </button>
                                </div>
                            )}

                            {/* Indicators (bottom center) */}
                            {mainBanners.length > 1 && (
                                <div
                                    className={
                                        "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1"
                                    }
                                >
                                    {mainBanners.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentIndex(idx)}
                                            className={
                                                "w-2 h-2 rounded-full " +
                                                (idx === currentIndex ? "bg-white" : "bg-white/40")
                                            }
                                            aria-label={`Slide ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right column: two ad boxes (original widths) */}
                <div className={"flex flex-col ml-6"}>
                    <div className={"rounded-lg w-67 h-75 overflow-hidden"}>
                        {topRightBanners.length === 0 ? (
                            <BannerPlaceholder
                                status={bannerStatuses.topRightBanners}
                                emptyText="광고 없음"
                            />
                        ) : (
                            topRightBanners.map((b, i) => (
                                <a
                                    key={b.id || i}
                                    href={b.linkUrl || "#"}
                                    className={"block w-full h-full"}
                                >
                                    {b.id ? (
                                        <HomeBanner fileId={b.id!} alt={`top-right-${i}`} />
                                    ) : (
                                        <div
                                            className={
                                                "w-full h-full flex items-center justify-center text-gray-400"
                                            }
                                        >
                                            이미지 없음
                                        </div>
                                    )}
                                </a>
                            ))
                        )}
                    </div>
                    <div
                        className={
                            "w-67 h-34 mt-6 border border-gray-300 rounded-lg overflow-hidden"
                        }
                    >
                        {bottomRightBanners.length === 0 ? (
                            <BannerPlaceholder
                                status={bannerStatuses.bottomRightBanners}
                                emptyText="광고 없음"
                            />
                        ) : (
                            bottomRightBanners.map((b, i) => (
                                <a
                                    key={b.id || i}
                                    href={b.linkUrl || "#"}
                                    className={"block w-full h-full"}
                                >
                                    {b.id ? (
                                        <HomeBanner fileId={b.id!} alt={`bottom-right-${i}`} />
                                    ) : (
                                        <div
                                            className={
                                                "w-full h-full flex items-center justify-center text-gray-400"
                                            }
                                        >
                                            이미지 없음
                                        </div>
                                    )}
                                </a>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recommendation / book detail section (restored) */}
            <div className={"flex flex-col mt-15"}>
                <div className={"flex items-end text-2xl"}>
                    <span className={"font-suite w-35"}>
                        {currentWeek?.monthLabel || "기간 정보 없음"}
                    </span>
                    <span className={"font-suite w-62 text-3xl"}>
                        <span className={"font-bold pr-3"}>{currentWeek?.weekLabel || ""}</span>
                        <span>이주의 책</span>
                    </span>
                </div>
                {availableCourses.length > 0 && (
                    <div
                        role="group"
                        aria-label="이주의 책 코스"
                        className="mt-5 flex w-fit items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1 font-suite text-sm"
                    >
                        {availableCourses.map((level) => (
                            <button
                                key={level.key}
                                type="button"
                                aria-pressed={selectedRecommendationLevel === level.key}
                                onClick={() => handleRecommendationLevelChange(level.key)}
                                className={
                                    "rounded-full px-6 py-2 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 motion-reduce:transition-none " +
                                    (selectedRecommendationLevel === level.key
                                        ? "bg-neutral-800 text-white shadow-sm"
                                        : "text-neutral-500 hover:bg-white hover:text-neutral-800")
                                }
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isRecommendationLoading ? (
                <div
                    className={
                        "flex mt-5 font-suite items-center justify-center w-full h-90 text-gray-400"
                    }
                >
                    추천 도서를 불러오는 중입니다.
                </div>
            ) : !recommendationBook ? (
                <div
                    className={
                        "flex mt-5 font-suite items-center justify-center w-full h-90 text-gray-400"
                    }
                >
                    등록된 추천 도서가 없습니다.
                </div>
            ) : (
                <div className={"flex mt-5"}>
                    <div className="flex flex-col">
                        <div className={"w-60 h-90 border border-gray-500 overflow-hidden"}>
                            {recommendationBook.customCoverImg ? (
                                <ServerImg
                                    fileId={recommendationBook.customCoverImg}
                                    alt={recommendationBook.title}
                                    className={"w-full h-full object-cover"}
                                />
                            ) : (
                                <img
                                    src={recommendationBook.coverImg}
                                    alt={recommendationBook.title}
                                    className={"w-full h-full object-cover"}
                                />
                            )}
                        </div>
                        <BookStarButton
                            className="mt-2"
                            title={decodeHtml(recommendationBook.title)}
                            status={bookStars[recommendationBook.isbn]}
                            pending={!!pendingStars[recommendationBook.isbn]}
                            error={starErrors[recommendationBook.isbn]}
                            onToggle={() => void toggleStar(recommendationBook.isbn)}
                            onRetry={() => void loadStarStatus(recommendationBook.isbn)}
                        />
                    </div>
                    <div className={"flex flex-col ml-5"}>
                        <div
                            style={{
                                background:
                                    "linear-gradient(90deg,rgba(255, 255, 255, 0) 0%, rgba(255, 25, 0, 1) 35%, rgba(255, 25, 0, 1) 65%, rgba(0, 61, 37, 0) 100%)"
                            }}
                            className={
                                "flex items-center justify-center font-bold w-20 h-5 text-center text-white"
                            }
                        >
                            <span className={"font-suite"}>{recommendationBook.difficulty}</span>
                        </div>
                        <span className={"font-bold text-[2rem]"}>
                            {decodeHtml(recommendationBook.title)}
                        </span>
                        {recommendationBook.subtitle && (
                            <span
                                className={
                                    "font-bold text-[1.4rem] ml-0.75 -mt-1.25 text-neutral-400"
                                }
                            >
                                {decodeHtml(recommendationBook.subtitle)}
                            </span>
                        )}
                        <div className={"ml-1 mt-3 w-200 h-70"}>
                            <span className={"font-bold flex items-center text-green-600"}>
                                <IoChatbubbleEllipsesOutline className={"mb-0.5"} />
                                <span className={"font-seoulnamsan ml-2"}>책 개요</span>
                            </span>
                            <div className={"text-[1.02rem] mt-1 font-batang font-bold"}>
                                {decodeHtml(recommendationBook.description) ||
                                    "등록된 책 개요가 없습니다."}
                            </div>
                            <div className={"relative text-[1.02rem] mt-2"}>
                                <div
                                    className={
                                        "absolute w-200 h-45 flex justify-center items-end z-1"
                                    }
                                    style={{
                                        background:
                                            "linear-gradient(0deg,rgba(255, 255, 255, 1) 0%, rgba(0, 61, 37, 0) 100%)"
                                    }}
                                >
                                    {recommendationPost && (
                                        <Link
                                            to={`/weekly-recommendations/${recommendationPost.id}`}
                                            className="mb-2 text-neutral-500 font-bold font-suite hover:underline underline-offset-4"
                                        >
                                            전체 글 보기
                                        </Link>
                                    )}
                                </div>
                                <span className={"font-bold flex items-center text-green-600"}>
                                    <IoChatbubbleEllipsesOutline className={"mb-0.5"} />
                                    <span className={"ml-2 font-seoulnamsan"}>쉼표지기의 추천</span>
                                </span>
                                {recommendationPost && (
                                    <div
                                        className={
                                            "mt-1 flex items-center gap-2 font-suite text-xs text-gray-500"
                                        }
                                    >
                                        <span className={"font-bold text-gray-700"}>
                                            {decodeHtml(recommendationPost.title)}
                                        </span>
                                        <span>
                                            {new Date(
                                                recommendationPost.createdAt * 1000
                                            ).toLocaleDateString("ko-KR")}
                                        </span>
                                        <span>작성자: {recommendationPost.author}</span>
                                    </div>
                                )}
                                <div className={"mt-1 overflow-hidden h-37.5 z-0"}>
                                    {recommendationPost ? (
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: recommendationPost.content
                                            }}
                                        />
                                    ) : (
                                        "이번 주차에 등록된 추천 글이 없습니다."
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section
                className={"flex flex-col mt-8"}
                aria-labelledby="popular-recommendations-heading"
            >
                <h2 id="popular-recommendations-heading" className={"font-suite text-3xl"}>
                    과거 인기 추천 책 모아보기
                </h2>
                {popularError && (
                    <div role="alert" className="font-suite text-sm text-red-600 mt-4">
                        인기 추천 도서를 불러오지 못했습니다.
                        <button
                            type="button"
                            onClick={() => void loadPopularBooks()}
                            className="ml-2 underline"
                        >
                            다시 시도
                        </button>
                    </div>
                )}
                <div className={"flex justify-center w-full mt-5"}>
                    {isPopularLoading ? (
                        <p role="status" className="font-suite text-gray-400 py-12">
                            인기 추천 도서를 불러오는 중입니다.
                        </p>
                    ) : popularBooks.length === 0 ? (
                        !popularError && (
                            <p className="font-suite text-gray-400 py-12">
                                아직 책갈피가 11개 이상 꽂힌 과거 추천 도서가 없습니다.
                            </p>
                        )
                    ) : (
                        popularBooks.map((book, index) => (
                            <div
                                key={book.isbn}
                                className={clsx("flex flex-col", index > 0 && "ml-8")}
                            >
                                <div
                                    className={
                                        "w-40 shrink-0 h-60 border border-black overflow-hidden"
                                    }
                                >
                                    {book.customCoverImg ? (
                                        <ServerImg
                                            fileId={book.customCoverImg}
                                            alt={decodeHtml(book.title)}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={book.coverImg}
                                            alt={decodeHtml(book.title)}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                                <BookStarButton
                                    className="mt-1"
                                    title={decodeHtml(book.title)}
                                    status={bookStars[book.isbn]}
                                    fallbackCount={book.starCount}
                                    pending={!!pendingStars[book.isbn]}
                                    error={starErrors[book.isbn]}
                                    onToggle={() => void toggleStar(book.isbn)}
                                    onRetry={() => void loadStarStatus(book.isbn)}
                                />
                                <div
                                    className={
                                        "font-suite text-[1.3rem] w-40 wrap-break-word leading-6"
                                    }
                                >
                                    {decodeHtml(book.title)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
