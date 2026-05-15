import React, { useState } from "react";
import axios from "axios";
import { MdOutlineFileUpload, MdCheckCircle, MdCached, MdDelete } from "react-icons/md";

import { BACKEND_ADDRESS } from "../../App";
import SubmitButton from "./lib_component/SubmitButton.tsx";
import Component, { Title, SubTitle } from "./lib_component/Component";

const LEVEL_STYLES: Record<string, { label: string; color: string }> = {
    high: { label: "상급", color: "bg-red-600" },
    mid: { label: "중급", color: "bg-yellow-500" },
    low: { label: "초급", color: "bg-blue-600" }
};

export default function ManageMainPage() {
    const [books] = useState({
        high: { title: "용의자 X의 헌신", author: "히가시노 게이고" },
        mid: { title: "노르웨이의 숲", author: "무라카미 하루키" },
        low: { title: "달러구트 꿈 백화점", author: "이미예" }
    });

    const [mainPick, setMainPick] = useState<string>("high");
    const [leftBanner, setLeftBanner] = useState<File | null>(null);
    const [topRightBanners, setTopRightBanners] = useState<File[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<File[]>([]);

    // 파일 확장자 체크 함수
    const isValidFile = (file: File) => {
        const validExtensions = ["image/png", "image/jpeg", "image/jpg"];
        return validExtensions.includes(file.type);
    };

    const handleFileAdd = (
        e: React.ChangeEvent<HTMLInputElement>,
        target: "left" | "top" | "bottom"
    ) => {
        const files = e.target.files;
        if (!files) return;

        const filteredFiles = Array.from(files).filter((file) => {
            if (!isValidFile(file)) {
                alert(`${file.name}는 지원하는 파일 형식이 아닙니다. (이미지 파일만 가능)`);
                return false;
            }
            return true;
        });

        if (target === "left") {
            if (filteredFiles.length > 0) setLeftBanner(filteredFiles[0]);
        } else if (target === "top") {
            setTopRightBanners((prev) => [...prev, ...filteredFiles]);
        } else {
            setBottomRightBanners((prev) => [...prev, ...filteredFiles]);
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
            alert("업로드 완료!");
        } catch (_) {
            alert("백엔드 확인해봐 ㅋ");
        }
    };

    return (
        <Component>
            <Title>메인 페이지 관리</Title>

            {/* --- 도서 관리 섹션 --- */}
            <SubTitle description={"2026년 5월 2주차"}>정기추천 책 관리</SubTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4 mb-10 mr-5">
                {Object.entries(books).map(([level, info]) => (
                    <div
                        key={level}
                        className={`relative p-5 border-2 rounded-md transition-all ${mainPick === level ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"}`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div
                                className={`px-3 py-1 rounded-full text-xs font-bold text-white ${LEVEL_STYLES[level].color}`}
                            >
                                {LEVEL_STYLES[level].label}
                            </div>
                            <button className="flex items-center text-xs text-gray-400 hover:text-blue-500 transition-colors">
                                <MdCached size={16} className="mr-1" /> 교체
                            </button>
                        </div>
                        <div className="cursor-pointer" onClick={() => setMainPick(level)}>
                            <div className="font-bold text-xl text-gray-800">{info.title}</div>
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

            {/* --- 배너 관리 섹션 (좌/우 분할) --- */}
            <SubTitle>홈페이지 배너 관리</SubTitle>
            <div className="flex flex-col lg:flex-row ml-4 gap-1">
                {/* 좌측: 메인 배너 미리보기 (고정) */}
                <div className="w-full lg:w-1/2">
                    <div className="font-suite text-gray-600 mb-3 font-bold">
                        좌측 메인 배너{" "}
                        <span className="font-normal text-xs text-gray-400 ml-2">
                            2100x1000 권장
                        </span>
                    </div>
                    <label className="block relative w-full aspect-21/10 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md overflow-hidden cursor-pointer hover:bg-gray-200 transition-all">
                        {leftBanner ? (
                            <img
                                src={URL.createObjectURL(leftBanner)}
                                alt="main"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                <MdOutlineFileUpload size={48} />
                                <span className="mt-2 font-suite">클릭하여 메인 배너 업로드</span>
                            </div>
                        )}
                        <input
                            type="file"
                            className="hidden"
                            accept=".png, .jpg, .jpeg"
                            onChange={(e) => handleFileAdd(e, "left")}
                        />
                    </label>
                    {leftBanner && (
                        <div
                            className="mt-2 text-right text-xs text-red-500 cursor-pointer underline"
                            onClick={() => setLeftBanner(null)}
                        >
                            이미지 제거
                        </div>
                    )}
                </div>

                {/* 우측: 상단/하단 랜덤 배너 관리 (리스트) */}
                <div className="w-full lg:w-1/2 space-y-8 mx-5">
                    {/* 우상단 */}
                    <section>
                        <div className="font-suite text-gray-600 mb-2 font-bold">
                            우상단 랜덤 배너{" "}
                            <span className="font-normal text-xs text-gray-400 ml-2">
                                630x750 권장
                            </span>
                        </div>
                        <label className="w-full py-3 bg-white border border-blue-400 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-all mb-3 text-blue-500">
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                accept=".png, .jpg, .jpeg"
                                onChange={(e) => handleFileAdd(e, "top")}
                            />
                            <MdOutlineFileUpload size={20} className="mr-2" />
                            <span className="text-sm font-bold">상단 배너 추가</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {topRightBanners.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center p-2 border border-gray-200 rounded bg-white group"
                                >
                                    <img
                                        alt={file.name}
                                        src={URL.createObjectURL(file)}
                                        className="w-10 h-12 object-cover rounded-sm mr-2"
                                    />
                                    <span className="text-[10px] text-gray-500 flex-1 truncate">
                                        {file.name}
                                    </span>
                                    <MdDelete
                                        onClick={() => removeFile("top", i)}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer"
                                        size={18}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 우하단 */}
                    <section>
                        <div className="font-suite text-gray-600 mb-2 font-bold">
                            우하단 랜덤 배너{" "}
                            <span className="font-normal text-xs text-gray-400 ml-2">
                                630x300 권장
                            </span>
                        </div>
                        <label className="w-full py-3 bg-white border border-green-400 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-green-50 transition-all mb-3 text-green-500">
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                accept=".png, .jpg, .jpeg"
                                onChange={(e) => handleFileAdd(e, "bottom")}
                            />
                            <MdOutlineFileUpload size={20} className="mr-2" />
                            <span className="text-sm font-bold">하단 배너 추가</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {bottomRightBanners.map((file, i) => (
                                <div
                                    key={i}
                                    className="flex items-center p-2 border border-gray-200 rounded bg-white group"
                                >
                                    <img
                                        alt={file.name}
                                        src={URL.createObjectURL(file)}
                                        className="w-12 h-6 object-cover rounded-sm mr-2"
                                    />
                                    <span className="text-[10px] text-gray-500 flex-1 truncate">
                                        {file.name}
                                    </span>
                                    <MdDelete
                                        onClick={() => removeFile("bottom", i)}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer"
                                        size={18}
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
