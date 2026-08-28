import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CiStar } from "react-icons/ci";
import { MdPause, MdPlayArrow, MdArrowForwardIos, MdArrowBackIosNew } from "react-icons/md";
import { useEffect, useState, useRef } from "react";

import { BACKEND_ADDRESS, api } from "../index.tsx";
import ServerImg from "../component/ServerImg.tsx";
import { fetchAdminSetting } from "./admin/ManageMainPage.tsx";

import clsx from "clsx";

type BannerItem = { id?: string; linkUrl?: string };

export default function Main() {
    const [noticeTitle, setNoticeTitle] = useState<string | null>(null);

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

    useEffect(() => {
        const fetch = async () => {
            // latest notice via PostController
            try {
                const res = await api.get(`${BACKEND_ADDRESS}posts/latestnotice`);
                if (res?.data?.title) setNoticeTitle(res.data.title);
            } catch (err) {
                console.error("공지 조회 실패:", err);
            }

            const leftVal = await fetchAdminSetting("leftBanner");
            const topVal = await fetchAdminSetting("topRightBanners");
            const bottomVal = await fetchAdminSetting("bottomRightBanners");

            const main = parseBannerData(leftVal);
            const tops = parseBannerData(topVal);
            const bots = parseBannerData(bottomVal);

            setMainBanners(main);

            // Randomize top/right banners: pick one per slot on each page load
            setTopRightBanners(tops.length > 0 ? [tops[Math.floor(Math.random() * tops.length)]] : []);
            setBottomRightBanners(bots.length > 0 ? [bots[Math.floor(Math.random() * bots.length)]] : []);
        };

        void fetch();
    }, []);

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
                            "w-67 h-34 mt-6 border border-gray-300 rounded-lg bg-[#14897B] flex items-center justify-center text-white"
                        }
                    >
                        광고2
                    </div>
                </div>
            </div>

            {/* Recommendation / book detail section (restored) */}
            <div className={"flex flex-col mt-15"}>
                <div className={"flex items-end text-2xl"}>
                    <span className={"font-suite w-31"}>2026년 1월</span>
                    <span className={"font-suite w-62 text-3xl"}>
                        <span className={"font-bold pr-3"}>4주차</span>
                        <span>이주의 책</span>
                    </span>
                </div>
                <div className={"mt-1"}>
                    <span className={"text-gray-500 font-suite"}>다른 코스 책 보기</span>
                </div>
            </div>

            <div className={"flex mt-5"}>
                <div className={"w-60 h-90 border border-gray-500"}>{"<< 책 표지를 여기에 >>"}</div>
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
                        <span className={"font-suite"}>상급</span>
                    </div>
                    <span className={"font-bold text-[2rem]"}>용의자 X의 헌신</span>
                    <span className={"font-bold text-[1.4rem] ml-0.75 -mt-1.25 text-neutral-400"}>
                        容疑者Xの獻身
                    </span>
                    <div className={"ml-1 mt-3 w-200 h-70"}>
                        <span className={"font-bold flex items-center text-green-600"}>
                            <IoChatbubbleEllipsesOutline className={"mb-0.5"} />
                            <span className={"font-seoulnamsan ml-2"}>책 개요</span>
                        </span>
                        <div className={"text-[1.02rem] mt-1 font-batang font-bold"}>
                            초반부터 꼼꼼히 읽으면 충격적인 반전이 기다리고 있..............
                            <br />
                            예상치 못한 전개가 독자의 마음을 사로잡을 책
                        </div>
                        <div className={"relative text-[1.02rem] mt-2"}>
                            <div
                                className={"absolute w-200 h-45 flex justify-center items-end z-1"}
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
                            <div className={"mt-1 overflow-hidden h-37.5 z-0"}>
                                이 책은 논리적인 헌신을 통해 사랑의 깊이를 탐구합니다.
                                <br />
                                주인공의 철저한 계획과 헌신은 독자에게 강렬한 인상을 남깁니다.
                                <br />
                                Lorem Ipsum is simply dummy text of the printing and typesetting
                                industry.
                                <br />
                                Lorem Ipsum has been the industry's standard dummy text ever since
                                the 1500s, when an unknown printer took a galley of type and
                                scrambled it to make a type specimen book. It has survived not only
                                five centuries, but also the leap into electronic typesetting,
                                typesetting, 안녕하세요 반갑습니다 안녕하세요 the leap into
                                안녕하세요 반갑습니다 안녕하세요 반낙습ㄴ이ㅏ미ㅏㄴ럼ㄴ이ㅏ럼ㄴㅇ리
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
