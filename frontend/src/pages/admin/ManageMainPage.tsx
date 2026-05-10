import React, { useState } from "react";
import axios from "axios";
import { MdOutlineFileUpload, MdCheckCircle, MdCached, MdDelete } from "react-icons/md";

import { BACKEND_ADDRESS } from "../../App";
import SubmitButton from "./lib_component/SubmitButton.tsx";
import Component, { Title, SubTitle } from "./lib_component/Component";

const LEVEL_STYLES: Record<string, { label: string; color: string }> = {
    high: { label: "상급", color: "bg-red-600" },
    mid: { label: "중급", color: "bg-yellow-500" },
    low: { label: "하급", color: "bg-blue-600" }
};

export default function ManageMainPage() {
    // 1. 책 정보 (교체 기능 대비)
    const [books, setBooks] = useState({
        high: { title: "용의자 X의 헌신", author: "히가시노 게이고" },
        mid: { title: "노르웨이의 숲", author: "무라카미 하루키" },
        low: { title: "달러구트 꿈 백화점", author: "이미예" }
    });

    const [mainPick, setMainPick] = useState<string>("high");

    // 2. 배너 상태 (좌측은 단일, 우측은 리스트)
    const [leftBanner, setLeftBanner] = useState<File | null>(null);
    const [topRightBanners, setTopRightBanners] = useState<File[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<File[]>([]);

    const handleBookChange = (level: string) => {
        alert(`${level} 도서 교체 모달이나 검색 로직을 여기에 연결하면 됨 ㅋ`);
        // 예: setBooks(prev => ({ ...prev, [level]: selectedFromModal }));
    };

    const handleFileAdd = (
        e: React.ChangeEvent<HTMLInputElement>,
        target: "left" | "top" | "bottom"
    ) => {
        const files = e.target.files;
        if (!files) return;

        if (target === "left") {
            setLeftBanner(files[0]);
        } else if (target === "top") {
            setTopRightBanners((prev) => [...prev, ...Array.from(files)]);
        } else {
            setBottomRightBanners((prev) => [...prev, ...Array.from(files)]);
        }
    };

    const removeFile = (target: "top" | "bottom", index: number) => {
        if (target === "top") setTopRightBanners((prev) => prev.filter((_, i) => i !== index));
        else setBottomRightBanners((prev) => prev.filter((_, i) => i !== index));
    };

    const onApply = async () => {
        const formData = new FormData();
        formData.append("mainPick", mainPick);
        if (leftBanner) formData.append("leftMain", leftBanner);
        topRightBanners.forEach((file) => formData.append("topRight", file));
        bottomRightBanners.forEach((file) => formData.append("bottomRight", file));

        try {
            await axios.post(`${BACKEND_ADDRESS}adminsettings`, formData, {
                headers: {
                    "X-Client-Session-ID": localStorage.getItem("wca_token"),
                    "Content-Type": "multipart/form-data"
                }
            });
            alert("저장 성공!");
        } catch (_) {
            alert("전송 에러 ㅋ");
        }
    };

    return (
        <Component>
            <Title>메인 페이지 관리</Title>
            <SubTitle description={"2026년 5월 2주차"}>정기추천 책 관리</SubTitle>

            <span className={"font-suite text-gray-500 ml-4 my-2"}>
                선택한 책은 메인 화면에서 그 주의 대표 추천 책으로 표출됩니다.
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mb-10">
                {Object.entries(books).map(([level, info]) => (
                    <div
                        key={level}
                        className={`relative p-5 border-2 rounded-md transition-all ${
                            mainPick === level
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-gray-200 bg-white"
                        }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div
                                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${LEVEL_STYLES[level].color}`}
                            >
                                {LEVEL_STYLES[level].label}
                            </div>
                            <button
                                onClick={() => handleBookChange(level)}
                                className="flex items-center text-xs text-gray-400 hover:text-blue-500 transition-colors"
                            >
                                <MdCached size={16} className="mr-1" /> 교체
                            </button>
                        </div>

                        <div className="cursor-pointer" onClick={() => setMainPick(level)}>
                            <div className="font-bold text-xl text-gray-800 break-keep">
                                {info.title}
                            </div>
                            <div className="text-gray-500 mt-1">{info.author}</div>
                        </div>

                        <div
                            className="absolute bottom-4 right-4 cursor-pointer"
                            onClick={() => setMainPick(level)}
                        >
                            <MdCheckCircle
                                size={26}
                                className={mainPick === level ? "text-blue-500" : "text-gray-200"}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <SubTitle>홈페이지 배너 관리</SubTitle>
            <div className="ml-4 space-y-10">
                {/* 1. 좌측 대형 배너 (단일) */}
                <section>
                    <div className="font-suite text-gray-600 mb-2 font-bold italic">
                        좌측 메인 배너 (2100x1000)
                    </div>
                    <div className="flex items-start space-x-4">
                        <label className="shrink-0 w-64 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-all">
                            {leftBanner ? (
                                <img
                                    src={URL.createObjectURL(leftBanner)}
                                    alt="preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <>
                                    <MdOutlineFileUpload size={30} className="text-gray-400" />
                                    <span className="text-xs text-gray-400 mt-1">파일 업로드</span>
                                </>
                            )}
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileAdd(e, "left")}
                            />
                        </label>
                        {leftBanner && (
                            <button
                                onClick={() => setLeftBanner(null)}
                                className="text-red-500 text-sm underline mt-1"
                            >
                                삭제
                            </button>
                        )}
                    </div>
                </section>

                {/* 2. 우측 배너들 (리스트/랜덤 표출용) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pr-5">
                    {/* 우상단 */}
                    <section>
                        <div className="font-suite text-gray-600 mb-2 font-bold italic">
                            우상단 배너 (630x750)
                        </div>
                        <label className="w-full h-20 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-center cursor-pointer hover:bg-blue-100 mb-3">
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileAdd(e, "top")}
                            />
                            <MdOutlineFileUpload size={20} className="text-blue-400 mr-2" />
                            <span className="text-sm text-blue-500 font-bold">사진 추가하기</span>
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {topRightBanners.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center p-2 border border-gray-200 rounded-md bg-white"
                                >
                                    <img
                                        alt={file.name}
                                        src={URL.createObjectURL(file)}
                                        className="w-12 h-14 object-cover rounded-sm mr-3"
                                    />
                                    <span className="text-xs text-gray-500 flex-1 truncate">
                                        {file.name}
                                    </span>
                                    <MdDelete
                                        onClick={() => removeFile("top", i)}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer"
                                        size={20}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 우하단 */}
                    <section>
                        <div className="font-suite text-gray-600 mb-2 font-bold italic">
                            우하단 배너 (630x300)
                        </div>
                        <label className="w-full h-20 bg-green-50 border border-green-200 rounded-md flex items-center justify-center cursor-pointer hover:bg-green-100 mb-3">
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => handleFileAdd(e, "bottom")}
                            />
                            <MdOutlineFileUpload size={20} className="text-green-400 mr-2" />
                            <span className="text-sm text-green-500 font-bold">사진 추가하기</span>
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {bottomRightBanners.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center p-2 border border-gray-200 rounded-md bg-white"
                                >
                                    <img
                                        alt={file.name}
                                        src={URL.createObjectURL(file)}
                                        className="w-16 h-8 object-cover rounded-sm mr-3"
                                    />
                                    <span className="text-xs text-gray-500 flex-1 truncate">
                                        {file.name}
                                    </span>
                                    <MdDelete
                                        onClick={() => removeFile("bottom", i)}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer"
                                        size={20}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            <SubmitButton
                className="ml-4 mt-16 mb-10"
                onClick_revert={() => window.location.reload()}
                onClick_apply={onApply}
            />
        </Component>
    );
}
