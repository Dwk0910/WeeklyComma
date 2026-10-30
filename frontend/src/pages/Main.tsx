import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CiStar } from "react-icons/ci";
import { MdPause, MdPlayArrow, MdArrowForwardIos, MdArrowBackIosNew } from "react-icons/md";
import { useCallback, useEffect, useState, useRef } from "react";

import { BACKEND_ADDRESS, api } from "../index.tsx";
import ServerImg from "../component/ServerImg.tsx";
import { fetchAdminSetting } from "./admin/ManageMainPage.tsx";

import clsx from "clsx";

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

const RECOMMENDATION_LEVELS = [
    { key: "low", label: "초급" },
    { key: "mid", label: "중급" },
    { key: "high", label: "상급" }
];

const decodeHtml = (value: string | null | undefined) => {
    if (!value) return "";
    return new DOMParser().parseFromString(value, "text/html").documentElement.textContent || "";
};

export default function Main() {
    const [noticeTitle, setNoticeTitle] = useState<string | null>(null);
    const [currentWeek, setCurrentWeek] = useState<CurrentWeekResponse | null>(null);
    const [selectedRecommendationLevel, setSelectedRecommendationLevel] =
        useState<string>("high");
    const [recommendationBook, setRecommendationBook] = useState<BookResponse | null>(null);
    const [recommendationPost, setRecommendationPost] = useState<RecommendationPost | null>(null);
    const [isRecommendationLoading, setIsRecommendationLoading] = useState(true);

    const [mainBanners, setMainBanners] = useState<BannerItem[]>([]); // 좌측 메인 배너(슬라이드)
    const [topRightBanners, setTopRightBanners] = useState<BannerItem[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<BannerItem[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const intervalRef = useRef<number | null>(null);

    const parseBannerData = (rawString: string | null): BannerItem[] => {
        if (!rawString) return [];
        return rawString
            .split(",")
            .filter(Boolean)
            .map((item) => {
                const [id, linkUrl] = item.split("|");
                return { id, linkUrl: linkUrl || "" };
            });
    };

    const loadRecommendation = useCallback(async (level: string) => {
        setIsRecommendationLoading(true);
        setRecommendationBook(null);
        setRecommendationPost(null);

        try {
            const recommendationIsbn = await fetchAdminSetting(`recommend_isbn_${level}`);
            if (!recommendationIsbn) return;

            const bookRes = await api.get<BookResponse>(
                `${BACKEND_ADDRESS}books/${recommendationIsbn}`
            );
            setRecommendationBook(bookRes.data);

            const recommendationPostId = await fetchAdminSetting(`recommend_post_${level}`);
            if (!recommendationPostId) return;

            const postRes = await api.get<RecommendationPost>(
                `${BACKEND_ADDRESS}posts/${recommendationPostId}`
            );
            const post = postRes.data;
            setRecommendationPost(post.attributions?.bookId === recommendationIsbn ? post : null);
        } catch (err) {
            console.error(`추천 도서 또는 추천글 조회 실패 [level: ${level}]:`, err);
        } finally {
            setIsRecommendationLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetch = async () => {
            // latest notice via PostController
            try {
                const res = await api.get(`${BACKEND_ADDRESS}posts/latestnotice`);
                if (res?.data?.title) setNoticeTitle(res.data.title);
            } catch (err) {
                console.error("공지 조회 실패:", err);
            }

            try {
                const weekRes = await api.get<CurrentWeekResponse>(
                    `${BACKEND_ADDRESS}current-week`
                );
                setCurrentWeek(weekRes.data);
            } catch (err) {
                console.error("현재 주차 조회 실패:", err);
            }

            const leftVal = await fetchAdminSetting("leftBanner");
            const topVal = await fetchAdminSetting("topRightBanners");
            const bottomVal = await fetchAdminSetting("bottomRightBanners");
            const mainPick = (await fetchAdminSetting("mainPick")) || "high";
            setSelectedRecommendationLevel(mainPick);
            await loadRecommendation(mainPick);

            const main = parseBannerData(leftVal);
            const tops = parseBannerData(topVal);
            const bots = parseBannerData(bottomVal);

            setMainBanners(main);

            // Randomize top/right banners: pick one per slot on each page load
            setTopRightBanners(
                tops.length > 0 ? [tops[Math.floor(Math.random() * tops.length)]] : []
            );
            setBottomRightBanners(
                bots.length > 0 ? [bots[Math.floor(Math.random() * bots.length)]] : []
            );
        };

        void fetch();
    }, [loadRecommendation]);

    const handleRecommendationLevelChange = async (level: string) => {
        setSelectedRecommendationLevel(level);
        await loadRecommendation(level);
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
                        <span
                            className={clsx(
                                "font-suite ml-3 font-bold text-[1.1rem]",
                                noticeTitle ? "cursor-pointer" : "cursor-default"
                            )}
                        >
                            {noticeTitle || "공지사항이 없습니다."}
                        </span>
                    </div>

                    <div className={"w-215 h-100 rounded-lg mt-5 overflow-hidden"}>
                        {/* Carousel rendered inside original-sized container */}
                        <div className={"relative w-full h-full"}>
                            {mainBanners.length === 0 ? (
                                <div
                                    className={
                                        "w-full h-full flex items-center justify-center text-gray-400"
                                    }
                                >
                                    배너가 없습니다.
                                </div>
                            ) : (
                                mainBanners.map((b, i) => (
                                    <a
                                        key={b.id || i}
                                        href={b.linkUrl || "#"}
                                        className={`absolute inset-0 transition-opacity duration-500 ${i === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                                    >
                                        {b.id ? (
                                            <ServerImg
                                                fileId={b.id}
                                                alt={`main-banner-${i}`}
                                                className={"w-full h-full object-cover"}
                                            />
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

                            {/* Indicators (bottom center) */}
                            {mainBanners.length > 0 && (
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
                            <div
                                className={
                                    "w-full h-full flex items-center justify-center text-gray-400"
                                }
                            >
                                광고 없음
                            </div>
                        ) : (
                            topRightBanners.map((b, i) => (
                                <a
                                    key={b.id || i}
                                    href={b.linkUrl || "#"}
                                    className={"block w-full h-full"}
                                >
                                    {b.id ? (
                                        <ServerImg
                                            fileId={b.id!}
                                            alt={`top-right-${i}`}
                                            className={"w-full h-full object-cover"}
                                        />
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
                            <div
                                className={
                                    "w-full h-full flex items-center justify-center text-gray-400"
                                }
                            >
                                광고 없음
                            </div>
                        ) : (
                            bottomRightBanners.map((b, i) => (
                                <a
                                    key={b.id || i}
                                    href={b.linkUrl || "#"}
                                    className={"block w-full h-full"}
                                >
                                    {b.id ? (
                                        <ServerImg
                                            fileId={b.id!}
                                            alt={`bottom-right-${i}`}
                                            className={"w-full h-full object-cover"}
                                        />
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
                    <span className={"font-suite w-31"}>
                        {currentWeek?.monthLabel || "기간 정보 없음"}
                    </span>
                    <span className={"font-suite w-62 text-3xl"}>
                        <span className={"font-bold pr-3"}>{currentWeek?.weekLabel || ""}</span>
                        <span>이주의 책</span>
                    </span>
                </div>
                <div className={"mt-1"}>
                    <span className={"text-gray-500 font-suite"}>다른 코스 책 보기</span>
                    <div className={"flex items-center gap-2 mt-2 font-suite text-sm"}>
                        {RECOMMENDATION_LEVELS.map((level) => (
                            <button
                                key={level.key}
                                type="button"
                                onClick={() => void handleRecommendationLevelChange(level.key)}
                                className={
                                    "px-3 py-1 rounded border transition-colors " +
                                    (selectedRecommendationLevel === level.key
                                        ? "bg-green-600 border-green-600 text-white"
                                        : "border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-600")
                                }
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>
                </div>
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
                                    <span className={"mb-2 text-neutral-400 font-bold font-suite"}>
                                        전체 글 보기
                                    </span>
                                </div>
                                <span className={"font-bold flex items-center text-green-600"}>
                                    <IoChatbubbleEllipsesOutline className={"mb-0.5"} />
                                    <span className={"ml-2 font-seoulnamsan"}>쉼표지기의 추천</span>
                                </span>
                                {recommendationPost && (
                                    <div className={"mt-1 flex items-center gap-2 font-suite text-xs text-gray-500"}>
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

            <div className={"flex flex-col mt-8"}>
                <span className={"font-suite text-3xl"}>과거 인기 추천 책 모아보기</span>
                <div className={"flex justify-center w-full mt-5"}>
                    <div className={"flex flex-col"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>12,512</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            UNWIND
                        </div>
                    </div>
                    <div className={"flex flex-col ml-8"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>10,501</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            죽이고 싶은 아이 1
                        </div>
                    </div>
                    <div className={"flex flex-col ml-8"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>8,210</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            스마트폰을 떨어 뜨렸을 뿐인데
                        </div>
                    </div>
                    <div className={"flex flex-col ml-8"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>5,972</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            열다섯에 곰이라니
                        </div>
                    </div>
                    <div className={"flex flex-col ml-8"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>3,250</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            돌이킬 수 없는 약속
                        </div>
                    </div>
                    <div className={"flex flex-col ml-8"}>
                        <div className={"w-40 shrink-0 h-60 border border-black"}></div>
                        <div className={"flex justify-start mt-1"}>
                            <span className={"text-[1.1rem] -ml-0.5"}>
                                <CiStar />
                            </span>
                            <span className={"font-suite ml-1 text-[0.8rem]"}>1,125</span>
                        </div>
                        <div className={"font-suite text-[1.3rem] w-40 wrap-break-word leading-6"}>
                            시한부
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
