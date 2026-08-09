import React, { useState, useRef } from "react";
import { MdCameraAlt } from "react-icons/md";

import { type Book } from "./ManageRecommendation.tsx";
import { BACKEND_ADDRESS, api } from "../../../index.tsx";

import FontStyle from "../../../assets/fonts/fonts.tsx";
import { SubTitle, Title } from "../lib_component/Component.tsx";
import ManageComponent from "../ManageBoards/ManageComponent.tsx";
import ServerImg from "../../../component/ServerImg.tsx";

// HTML Entity 해시 및 태그 제거용 유틸 함수 (렌더링 최적화)
const decodeHtml = (html: string | undefined | null) => {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.documentElement.textContent || "";
};

export default function ManageBook({
    book,
    setSelectedBook,
    refreshSearchResult
}: {
    book: Book;
    setSelectedBook: React.Dispatch<React.SetStateAction<Book | null>>;
    refreshSearchResult: () => void;
}) {
    // 미리보기 이미지: customCoverImg가 있으면 그걸 쓰고, 없으면 coverImg
    const [previewImg, setPreviewImg] = useState<string>(book.customCoverImg || book.coverImg);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "isbn") return;

        // Unix Timestamp(초) 단위 변환
        if (name === "pubDate") {
            const timestampInSeconds = value ? Math.floor(new Date(value).getTime() / 1000) : 0;
            setSelectedBook((prev) => prev && { ...prev, [name]: timestampInSeconds });
            return;
        }

        setSelectedBook((prev) => prev && { ...prev, [name]: value });
    };

    const handleImageClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            // 업로드할 새 파일이 생기면 브라우저용 Blob URL로 미리보기 교체
            setPreviewImg(URL.createObjectURL(file));
        }
    };

    // 커스텀 표지를 제거하고 기본 알라딘 표지로 되돌리는 함수
    const handleResetCoverImg = () => {
        setUploadFile(null);
        setPreviewImg(book.coverImg);
        setSelectedBook((prev) => prev && { ...prev, customCoverImg: null });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const requiredFields = [
        "title",
        "isbn",
        "author",
        "publisher",
        "coverImg",
        "description",
        "difficulty"
    ];

    const serverUpload = () => {
        // 필수 값 검증
        const isLack = requiredFields.some((field) => {
            const val = book[field as keyof Book];
            return val == null || val === "";
        });

        if (isLack) {
            alert("책에 대한 필수 정보가 비어 있습니다.");
            return;
        }

        const formData = new FormData();

        // book 객체의 키-값들을 append (null이나 undefined, customCoverImg는 걸러냄)
        Object.entries(book).forEach(([key, value]) => {
            if (key === "customCoverImg") return; // 파일 처리는 별도로 진행
            if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });

        // 새 파일이 선택되었다면 파일 전송
        if (uploadFile) {
            formData.append("customCoverImg", uploadFile);
        } else if (book.customCoverImg === null) {
            // 새 파일도 없고 customCoverImg가 null 상태라면 백엔드에 표지 삭제 요청용 빈 파라미터 전달
            formData.append("deleteCustomCover", "true");
        }

        api.post(BACKEND_ADDRESS + "books", formData).then(() => {
            alert("정상적으로 등록되었습니다.");
            setSelectedBook((prev) => prev && { ...prev, dbExist: true });
            refreshSearchResult();
        });
    };

    const removeBook = () => {
        if (confirm("정말 이 책을 삭제하시겠습니까? 등록한 정보가 모두 삭제됩니다.")) {
            api.delete(BACKEND_ADDRESS + `books?isbn=${book.isbn}`).then(() => {
                setSelectedBook(null);
                refreshSearchResult();
            });
        }
    };

    const inputStyle =
        "bg-transparent border-none border-b border-gray-200 outline-none focus:border-blue-500 transition-all px-1 py-0.5 w-full";

    const formatTimestampToDate = (timestamp: number | string | undefined | null) => {
        if (!timestamp) return "";
        const seconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
        if (isNaN(seconds) || seconds === 0) return "";

        const date = new Date(seconds * 1000);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    };

    // 커스텀 표지가 등록되어 있거나 새 파일이 선택된 경우에만 삭제 버튼을 노출
    const hasCustomCover = Boolean(book.customCoverImg || uploadFile);

    return (
        <div className="relative">
            <FontStyle />
            <div className="flex">
                <div className="flex flex-col items-center shrink-0">
                    <div className="relative">
                        {/*
                           새 파일(uploadFile)이 들어온 상태면 Blob 미리보기 img 태그 사용
                           새 파일이 없고 기존 customCoverImg가 존재하면 <ServerImg />
                           둘 다 아니면 기본 알라딘 coverImg 사용
                        */}
                        {!uploadFile && book.customCoverImg ? (
                            <ServerImg
                                fileId={previewImg}
                                alt="cover"
                                className="w-60 h-90 border border-gray-500"
                            />
                        ) : (
                            <img
                                src={previewImg}
                                alt="cover"
                                className="w-60 h-90 border border-gray-500"
                            />
                        )}

                        <div
                            className="absolute w-full h-90 inset-0 flex flex-col justify-center items-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 cursor-pointer"
                            onClick={handleImageClick}
                        >
                            <MdCameraAlt className="text-white text-[2rem]" />
                            <span className="font-suite text-white">사진 바꾸기</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* 커스텀 표지가 있거나 새로 선택된 파일이 있을 때 나타나는 초기화 클릭커블 텍스트 */}
                    {hasCustomCover && (
                        <button
                            type="button"
                            onClick={handleResetCoverImg}
                            className="mt-2 text-xs font-suite text-gray-400 underline cursor-pointer hover:text-red-500 transition-colors"
                        >
                            기본 표지로 변경 (커스텀 표지 제거)
                        </button>
                    )}
                </div>

                <div className="ml-6 flex flex-col flex-1">
                    <SubTitle description="각각의 정보를 클릭하여 수정할 수 있습니다.">
                        책 정보 확인
                    </SubTitle>
                    <input
                        name="title"
                        value={book.title || ""}
                        onChange={handleChange}
                        className={`${inputStyle} text-[1.8rem] font-[HCRBatang] font-bold`}
                        placeholder="책 제목"
                    />
                    <div className="flex items-center ml-2">
                        <input
                            name="subtitle"
                            value={book.subtitle || ""}
                            onChange={handleChange}
                            className={`${inputStyle} font-suite text-gray-700`}
                            placeholder="부제 입력"
                        />
                    </div>

                    <span className="text-gray-700 font-suite mt-6 font-bold">책 사양</span>

                    <div className="flex font-suite mt-3 text-gray-500">
                        <span>ISBN</span>
                        <span className="ml-3 font-bold">{book.isbn}</span>
                    </div>

                    <div className="flex flex-col mt-2">
                        {[
                            { label: "저자", name: "author" },
                            { label: "출판사", name: "publisher" }
                        ].map((field) => (
                            <div key={field.name} className="flex font-suite items-center">
                                <div className="text-gray-500 w-28 shrink-0">{field.label}</div>
                                <input
                                    name={field.name}
                                    value={decodeHtml(String(book[field.name as keyof Book] ?? ""))}
                                    placeholder="값을 입력해 주세요"
                                    onChange={handleChange}
                                    className={`${inputStyle} font-bold`}
                                />
                            </div>
                        ))}

                        <div className="flex font-suite items-center">
                            <div className="text-gray-500 w-28 shrink-0">출간일</div>
                            <input
                                type="date"
                                name="pubDate"
                                value={formatTimestampToDate(book.pubDate)}
                                onChange={handleChange}
                                className={`${inputStyle} font-bold cursor-pointer`}
                            />
                        </div>

                        <div className="flex items-center gap-6 mt-3">
                            <span className="text-gray-700 font-bold w-30 shrink-0 font-suite">
                                추천 도서 난이도
                            </span>
                            <div className="flex items-center gap-4">
                                {["초급", "중급", "상급"].map((level) => (
                                    <label
                                        key={`booklvl_${level}`}
                                        className="flex items-center gap-1.5 cursor-pointer text-sm font-medium text-gray-700 select-none"
                                    >
                                        <input
                                            type="radio"
                                            name="difficulty"
                                            value={level}
                                            checked={book.difficulty === level}
                                            onChange={handleChange}
                                            className="w-4 h-4 accent-gray-800 cursor-pointer"
                                        />
                                        {level}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <span className="text-gray-700 font-suite font-bold mt-3">책 설명</span>
                    <textarea
                        name="description"
                        value={decodeHtml(book.description)}
                        onChange={handleChange}
                        rows={6}
                        className="mt-2 font-[HCRBatang] mr-4 p-2 bg-gray-50/50 border border-gray-200 rounded-sm outline-none focus:border-blue-400 transition-all resize-none overflow-y-auto leading-relaxed"
                    />
                </div>
            </div>

            <div className="flex w-full justify-end mt-3">
                {book.dbExist && (
                    <button
                        className="cursor-pointer mr-5 bg-gray-500 p-4 text-white rounded-[5px] font-suite transition-transform hover:scale-105 ease-in-out"
                        onClick={removeBook}
                    >
                        책 정보 삭제
                    </button>
                )}
                <button
                    className="cursor-pointer mr-5 bg-gray-500 p-4 text-white rounded-[5px] font-suite transition-transform hover:scale-105 ease-in-out"
                    onClick={serverUpload}
                >
                    {`책 정보 ${book.dbExist ? "수정" : "저장"}`}
                </button>
            </div>

            <div className="mt-2">
                {book.dbExist ? (
                    <ManageComponent
                        postType="RECOMMENDATION"
                        title="추천글 관리"
                        attributions={{ bookId: book.isbn }}
                    />
                ) : (
                    <div className="mb-10">
                        <Title>추천글 관리</Title>
                        <SubTitle>책을 등록해야 추천글을 작성할 수 있습니다.</SubTitle>
                    </div>
                )}
            </div>
        </div>
    );
}
