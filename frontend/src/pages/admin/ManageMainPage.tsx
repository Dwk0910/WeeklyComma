import axios from "axios";
import { BACKEND_ADDRESS } from "../../App";
import { MdOutlineFileUpload } from "react-icons/md";
import SubmitButton from "./lib_component/SubmitButton.tsx";

export default function ManageMainPage() {
    return (
        <div className={"flex flex-col ml-4"}>
            <div className={"mt-4 font-suite font-bold text-[1.2rem]"}>메인 페이지 관리</div>
            <div className={"mt-2"}>
                <div className={"font-seoulnamsan"}>&nbsp;-&nbsp;&nbsp;정기추천 책 등록 관리</div>
                <div
                    className={
                        "ml-6 mb-2 -my-1.5 font-suite font-light text-gray-500 text-[0.8rem]"
                    }
                >
                    2026년 1월 4주차
                </div>
                <div className={"ml-4 font-suite text-gray-500"}>현재 정기추천중인 책</div>
                <div
                    className={
                        "w-120 h-25 border border-gray-300 bg-blue-300/40 rounded-sm ml-4 p-3"
                    }
                >
                    <div
                        style={{
                            background:
                                "linear-gradient(90deg,rgba(255, 255, 255, 0) 0%, rgba(255, 25, 0, 1) 35%, rgba(255, 25, 0, 1) 65%, rgba(0, 61, 37, 0) 100%)"
                        }}
                        className={
                            "flex items-center justify-center font-bold w-20 h-5 text-center text-white ml-2"
                        }
                    >
                        <span className={"font-suite"}>상급</span>
                    </div>
                    <div className={"flex flex-col ml-2 -mt-1"}>
                        <span className={"font-bold text-[1.7rem] ml-0.5"}>용의자 X의 헌신</span>
                        <span className={"-mt-2 ml-0.5 font-suite text-gray-500"}>
                            히가시노 게이고 저
                        </span>
                    </div>
                </div>
                <div className={"flex"}>
                    <div
                        className={
                            "ml-4 my-2 font-suite text-[0.9rem] border border-gray-300 inline-block p-2 rounded-sm bg-gray-600 text-white"
                        }
                    >
                        등록/수정하기
                    </div>
                    <div
                        className={
                            "ml-2 my-2 font-suite text-[0.9rem] border border-gray-300 inline-block p-2 rounded-sm bg-red-600/80 text-white"
                        }
                    >
                        삭제
                    </div>
                </div>
                <div className={"font-seoulnamsan mt-4"}>&nbsp;-&nbsp;&nbsp;홈페이지 배너 관리</div>
                <div className={"flex items-start ml-4 mt-2"}>
                    <div
                        className={
                            "w-50 h-50 border border-gray-600 rounded-sm flex flex-col items-center justify-center text-gray-400 text-center font-suite"
                        }
                    >
                        <MdOutlineFileUpload size={40} className={"mb-2"} />
                        <span>파일 업로드</span>
                        <span>(지원 형식: jpeg, jpg, png)</span>
                    </div>

                    <div className={"border-l border-gray-300 ml-7 pl-4"}>
                        <div className={"font-suite text-gray-500"}>
                            좌측 메인 배너
                            <span className={"text-[0.8rem] ml-2 text-gray-400"}>
                                2100x1000&nbsp;권장
                            </span>
                        </div>
                        <div
                            className={"flex flex-col mt-2 border border-gray-300 w-100 h-20"}
                        ></div>
                        <div className={"font-suite text-gray-500 mt-2"}>
                            우상단 배너
                            <span className={"text-[0.8rem] ml-2 text-gray-400"}>
                                630x750&nbsp;권장
                            </span>
                        </div>
                        <div
                            className={"flex flex-col mt-2 border border-gray-300 w-100 h-20"}
                        ></div>
                        <div className={"font-suite text-gray-500 mt-2"}>
                            우하단 배너&nbsp;
                            <span className={"text-[0.8rem] ml-2 text-gray-400"}>
                                630x300&nbsp;권장
                            </span>
                        </div>
                        <div
                            className={"flex flex-col mt-2 border border-gray-300 w-100 h-20"}
                        ></div>
                    </div>
                </div>
                <SubmitButton
                    className={"ml-4 mt-4 mb-4"}
                    onClick_revert={() => {}}
                    onClick_apply={() => {
                        axios
                            .post(
                                BACKEND_ADDRESS + "adminsettings",
                                { key: "weeklybook", value: "TEST" },
                                {
                                    headers: {
                                        "X-Client-Session-ID": localStorage.getItem("wca_token")
                                    }
                                }
                            )
                            .then((res) => {
                                alert(res.status);
                            });
                    }}
                />
            </div>
        </div>
    );
}
