import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { CiStar } from "react-icons/ci";

export default function Main() {
    return (
        <div className={"mx-5"}>
            <div className={"flex mt-5"}>
                <div className={"w-215 h-100 border border-gray-300 rounded-lg"}>
                    {"<< 배너를 여기에 >>"}
                </div>
                <div className={"border border-gray-300 rounded-lg w-63 h-100 ml-10"}>광고1</div>
            </div>
            <div className={"flex mt-10"}>
                <div className={"w-220 h-20"}>여기다가뭘넣으면좋을까</div>
                <div className={"ml-5 w-63 h-20 border border-gray-300 rounded-lg"}>광고2</div>
            </div>
            <div className={"flex flex-col"}>
                <div className={"flex items-end mt-5 text-2xl"}>
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
                        <span>상급</span>
                    </div>
                    <span className={"font-bold text-[2rem]"}>용의자 X의 헌신</span>
                    <span className={"font-bold text-[1.4rem] ml-0.75 -mt-1.25 text-neutral-400"}>
                        容疑者Xの獻身
                    </span>
                    <div className={"ml-1 mt-3 w-200 h-70"}>
                        <span className={"font-bold flex items-center text-green-600"}>
                            <IoChatbubbleEllipsesOutline />
                            <span className={"ml-2"}>책 개요</span>
                        </span>
                        <div className={"text-[1.02rem] mt-1 text-neutral-500 font-batang"}>
                            초반부터 꼼꼼히 읽으면 충격적인 반전이 기다리고 있..............
                            <br />
                            예상치 못한 전개가 독자의 마음을 사로잡을 책
                        </div>
                        <div className={"relative text-[1.02rem] mt-2"}>
                            <div
                                className={"absolute w-200 h-45 flex justify-center items-end"}
                                style={{
                                    background:
                                        "linear-gradient(0deg,rgba(255, 255, 255, 1) 0%, rgba(0, 61, 37, 0) 100%)"
                                }}
                            >
                                <span className={"mb-2 text-neutral-400 font-bold font-suite"}>
                                    전체 글 보기
                                </span>
                            </div>
                            이 책은 논리적인 헌신을 통해 사랑의 깊이를 탐구합니다.
                            <br />
                            주인공의 철저한 계획과 헌신은 독자에게 강렬한 인상을 남깁니다.
                            <br />
                            Lorem Ipsum is simply dummy text of the printing and typesetting
                            industry.
                            <br />
                            Lorem Ipsum has been the industry's standard dummy text ever since the
                            1500s, when an unknown printer took a galley of type and scrambled it to
                            make a type specimen book. It has survived not only five centuries, but
                            also the leap into electronic typesetting, remaining essentially
                            unchanged. It was popularised in the 1960s with the release of
                            Letrasetalso the leap into electronic typesetting,
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
