import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CiStar } from "react-icons/ci";
import { MdPause, MdPlayArrow, MdArrowForwardIos, MdArrowBackIosNew } from "react-icons/md";
import { useEffect, useState, useRef } from "react";

import { BACKEND_ADDRESS, api } from "../index.tsx";
import ServerImg from "../component/ServerImg.tsx";

type BannerItem = { id?: string; linkUrl?: string };

export default function Main() {
    const [noticeTitle, setNoticeTitle] = useState<string | null>(null);

    const [mainBanners, setMainBanners] = useState<BannerItem[]>([]); // 좌측 메인 배너(슬라이드)
    const [topRightBanners, setTopRightBanners] = useState<BannerItem[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<BannerItem[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const intervalRef = useRef<number | null>(null);

    const fetchAdminSetting = async (key: string): Promise<string | null> => {
        try {
            const res = await api.get(`${BACKEND_ADDRESS}adminsettings`, { params: { key } });
            if (res.data === null || res.data === undefined || res.data === "") return null;
            return String(res.data);
        } catch (err) {
            console.error(`adminsetting 가져오기 실패 [key: ${key}]:`, err);
            return null;
        }
    };

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

            setMainBanners(parseBannerData(leftVal));
            setTopRightBanners(parseBannerData(topVal));
            setBottomRightBanners(parseBannerData(bottomVal));
        };

        void fetch();
    }, []);

    // autoplay
    useEffect(() => {
        if (!isPlaying || mainBanners.length <= 1) return;

        intervalRef.current = window.setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
        }, 4000);

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
            <div className={"mb-4 w-full flex items-center"}>
                <div className={"px-3 py-1 rounded-lg bg-red-400 text-white font-suite mr-3"}>공지</div>
                <div className={"font-suite font-bold text-lg"}>{noticeTitle || "공지사항이 없습니다."}</div>
            </div>

            <div className={"flex"}>
                {/* Main banner area (슬라이드) */}
                <div className={"flex flex-col w-3/5"}>
                    <div className={"relative w-full h-80 rounded-lg overflow-hidden bg-gray-100"}>
                        {mainBanners.length === 0 ? (
                            <div className={"w-full h-full flex items-center justify-center text-gray-400"}>
                                배너가 없습니다.
                            </div>
                        ) : (
                            mainBanners.map((b, i) => (
                                <a
                                    key={b.id || i}
                                    href={b.linkUrl || "#"}
                                    className={
                                        `absolute inset-0 transition-opacity duration-500 ${i === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`
                                    }
                                >
                                    {b.id ? (
                                        <ServerImg fileId={b.id} alt={`main-banner-${i}`} className={"w-full h-full object-cover"} />
                                    ) : (
                                        <div className={"w-full h-full flex items-center justify-center text-gray-400"}>
                                            이미지 없음
                                        </div>
                                    )}
                                </a>
                            ))
                        )}

                        {/* Controls (오른쪽 아래) */}
                        <div className={"absolute bottom-3 right-3 flex items-center gap-2 bg-black/30 rounded-md p-1"}>
                            <button onClick={() => setIsPlaying((p) => !p)} className={"text-white p-1 rounded hover:bg-white/10"} title={isPlaying ? "일시정지" : "재생"}>
                                {isPlaying ? <MdPause /> : <MdPlayArrow />}
                            </button>
                            <button onClick={goPrev} className={"text-white p-1 rounded hover:bg-white/10"} title="이전">
                                <MdArrowBackIosNew />
                            </button>
                            <button onClick={goNext} className={"text-white p-1 rounded hover:bg-white/10"} title="다음">
                                <MdArrowForwardIos />
                            </button>
                        </div>

                        {/* Indicators (bottom center) */}
                        {mainBanners.length > 0 && (
                            <div className={"absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1"}>
                                {mainBanners.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={"w-2 h-2 rounded-full " + (idx === currentIndex ? "bg-white" : "bg-white/40")}
                                        aria-label={`Slide ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right column: top & bottom banners */}
                <div className={"flex flex-col ml-6 w-2/5 gap-4"}>
                    <div className={"rounded-lg w-full h-48 overflow-hidden bg-gray-50"}>
                        {topRightBanners.length === 0 ? (
                            <div className={"w-full h-full flex items-center justify-center text-gray-400"}>광고 없음</div>
                        ) : (
                            topRightBanners.map((b, i) => (
                                <a key={b.id || i} href={b.linkUrl || "#"} className={"block w-full h-full"}>
                                    {b.id ? (
                                        <ServerImg fileId={b.id!} alt={`top-right-${i}`} className={"w-full h-full object-cover"} />
                                    ) : (
                                        <div className={"w-full h-full flex items-center justify-center text-gray-400"}>이미지 없음</div>
                                    )}
                                </a>
                            ))
                        )}
                    </div>

                    <div className={"rounded-lg w-full h-28 overflow-hidden bg-gray-50"}>
                        {bottomRightBanners.length === 0 ? (
                            <div className={"w-full h-full flex items-center justify-center text-gray-400"}>광고 없음</div>
                        ) : (
                            bottomRightBanners.map((b, i) => (
                                <a key={b.id || i} href={b.linkUrl || "#"} className={"block w-full h-full"}>
                                    {b.id ? (
                                        <ServerImg fileId={b.id!} alt={`bottom-right-${i}`} className={"w-full h-full object-cover"} />
                                    ) : (
                                        <div className={"w-full h-full flex items-center justify-center text-gray-400"}>이미지 없음</div>
                                    )}
                                </a>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Rest of page unchanged (kept some static sections) */}
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
