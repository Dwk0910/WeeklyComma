import React, { useState, useEffect } from "react";
import {
    MdOutlineFileUpload,
    MdCheckCircle,
    MdCached,
    MdDelete,
    MdSearch,
    MdClose,
    MdLink
} from "react-icons/md";

import { BACKEND_ADDRESS, api } from "../../index.tsx";
import SubmitButton from "./lib_component/SubmitButton.tsx";
import Component, { Title, SubTitle } from "./lib_component/Component";
import ServerImg from "../../component/ServerImg.tsx";

const LEVEL_STYLES: Record<string, { label: string; color: string }> = {
    high: { label: "상급", color: "bg-red-600" },
    mid: { label: "중급", color: "bg-yellow-500" },
    low: { label: "초급", color: "bg-blue-600" }
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

type BannerItem = {
    id?: string;
    originalName?: string;
    file?: File;
    previewUrl?: string;
    linkUrl?: string;
};

export default function ManageMainPage() {
    const [books, setBooks] = useState<
        Record<string, { title: string; author: string; isbn?: string }>
    >({
        high: { title: "책 미설정", author: "-" },
        mid: { title: "책 미설정", author: "-" },
        low: { title: "책 미설정", author: "-" }
    });

    const [mainPick, setMainPick] = useState<string>("high");

    const [leftBanners, setLeftBanners] = useState<BannerItem[]>([]);
    const [topRightBanners, setTopRightBanners] = useState<BannerItem[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<BannerItem[]>([]);

    const [searchModalLevel, setSearchModalLevel] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<BookResponse[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);

    const [deletedServerIds, setDeletedServerIds] = useState<string[]>([]);

    const fetchAdminSetting = async (key: string): Promise<string | null> => {
        try {
            const res = await api.get(`${BACKEND_ADDRESS}adminsettings`, {
                params: { key }
            });
            if (res.data === null || res.data === undefined || res.data === "") {
                return null;
            }
            return String(res.data);
        } catch (err) {
            console.error(`adminsetting 가져오기 실패 [key: ${key}]:`, err);
            return null;
        }
    };

    const parseBannerData = (rawString: string): BannerItem[] => {
        if (!rawString) return [];
        return rawString
            .split(",")
            .filter(Boolean)
            .map((item) => {
                const [id, linkUrl] = item.split("|");
                return {
                    id,
                    linkUrl: linkUrl || ""
                };
            });
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            const mainPickVal = await fetchAdminSetting("mainPick");
            if (mainPickVal) setMainPick(mainPickVal);

            const leftVal = await fetchAdminSetting("leftBanner");
            if (leftVal) setLeftBanners(parseBannerData(leftVal));

            const topVal = await fetchAdminSetting("topRightBanners");
            if (topVal) setTopRightBanners(parseBannerData(topVal));

            const bottomVal = await fetchAdminSetting("bottomRightBanners");
            if (bottomVal) setBottomRightBanners(parseBannerData(bottomVal));

            const levels = ["high", "mid", "low"];
            for (const level of levels) {
                const isbn = await fetchAdminSetting(`recommend_isbn_${level}`);
                if (isbn) {
                    try {
                        const bookRes = await api.get<BookResponse>(
                            `${BACKEND_ADDRESS}books/${isbn}`
                        );
                        if (bookRes?.data) {
                            setBooks((prev) => ({
                                ...prev,
                                [level]: {
                                    title: bookRes.data.title,
                                    author: bookRes.data.author,
                                    isbn: bookRes.data.isbn
                                }
                            }));
                        }
                    } catch (err) {
                        console.error(`도서 정보 조회 실패 [isbn: ${isbn}]:`, err);
                    }
                }
            }
        };

        void fetchInitialData();
    }, []);

    const handleFileNameLoaded = (
        target: "left" | "top" | "bottom",
        index: number,
        fileName: string
    ) => {
        const updater = (prev: BannerItem[]) =>
            prev.map((item, i) => (i === index ? { ...item, originalName: fileName } : item));

        if (target === "left") setLeftBanners(updater);
        else if (target === "top") setTopRightBanners(updater);
        else setBottomRightBanners(updater);
    };

    // URL 입력 필터링 (구분자 | 와 , 입력 불가능)
    const handleLinkUrlChange = (
        target: "left" | "top" | "bottom",
        index: number,
        rawValue: string
    ) => {
        // 구분자로 사용하는 | 및 , 필터링 제거
        const sanitizedValue = rawValue.replace(/[|,]/g, "");

        const updater = (prev: BannerItem[]) =>
            prev.map((item, i) => (i === index ? { ...item, linkUrl: sanitizedValue } : item));

        if (target === "left") setLeftBanners(updater);
        else if (target === "top") setTopRightBanners(updater);
        else setBottomRightBanners(updater);
    };

    const handleSearchBooks = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await api.get<BookResponse[]>(`${BACKEND_ADDRESS}books`, {
                params: { query: searchQuery }
            });

            const targetLabel = LEVEL_STYLES[searchModalLevel || ""]?.label;

            if (res.data && Array.isArray(res.data)) {
                const filtered = res.data.filter((book) => book.difficulty === targetLabel);
                setSearchResults(filtered);
            } else {
                setSearchResults([]);
            }
        } catch (err) {
            console.error("도서 검색 중 오류:", err);
            alert("도서 검색에 실패했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectBook = (book: BookResponse) => {
        if (!searchModalLevel) return;

        setBooks((prev) => ({
            ...prev,
            [searchModalLevel]: {
                title: book.title,
                author: book.author,
                isbn: book.isbn
            }
        }));

        setSearchModalLevel(null);
        setSearchQuery("");
        setSearchResults([]);
    };

    const isValidFile = (file: File) => {
        const validExtensions = ["image/png", "image/jpeg", "image/jpg"];
        return validExtensions.includes(file.type);
    };

    const handleFileAdd = (
        e: React.ChangeEvent<HTMLInputElement>,
        target: "left" | "top" | "bottom"
    ) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const validFiles = Array.from(files).filter((file) => {
            if (!isValidFile(file)) {
                alert(`${file.name}는 지원하는 파일 형식이 아닙니다. (이미지 파일만 가능)`);
                return false;
            }
            return true;
        });

        const newItems: BannerItem[] = validFiles.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            linkUrl: ""
        }));

        if (target === "left") {
            setLeftBanners((prev) => [...prev, ...newItems]);
        } else if (target === "top") {
            setTopRightBanners((prev) => [...prev, ...newItems]);
        } else {
            setBottomRightBanners((prev) => [...prev, ...newItems]);
        }

        e.target.value = "";
    };

    const removeFile = (target: "left" | "top" | "bottom", index: number) => {
        if (target === "left") {
            const targetItem = leftBanners[index];
            if (targetItem?.id) {
                setDeletedServerIds((prev) => [...prev, targetItem.id!]);
            }
            setLeftBanners((prev) => prev.filter((_, i) => i !== index));
        } else if (target === "top") {
            const targetItem = topRightBanners[index];
            if (targetItem?.id) {
                setDeletedServerIds((prev) => [...prev, targetItem.id!]);
            }
            setTopRightBanners((prev) => prev.filter((_, i) => i !== index));
        } else {
            const targetItem = bottomRightBanners[index];
            if (targetItem?.id) {
                setDeletedServerIds((prev) => [...prev, targetItem.id!]);
            }
            setBottomRightBanners((prev) => prev.filter((_, i) => i !== index));
        }
    };

    const processBannerList = async (banners: BannerItem[]): Promise<string[]> => {
        const resultItems: string[] = [];
        for (const item of banners) {
            let fileId = item.id;
            if (item.file) {
                // If there was a previously uploaded file for this banner (item.id), send it as prevId
                fileId = await uploadSingleFile(item.file, item.id);
            }

            if (fileId) {
                // 저장 전 최종 검증 (구분자 한 번 더 제거)
                const url = (item.linkUrl || "").replace(/[|,]/g, "").trim();
                resultItems.push(`${fileId}|${url}`);
            }
        }
        return resultItems;
    };

    const uploadSingleFile = async (file: File, prevId?: string): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);

        // If prevId is provided, send it as a query param so the backend can delete the previous file
        const config: { params?: unknown } = {};
        if (prevId) {
            config.params = { prevId };
        }

        const res = await api.post(`${BACKEND_ADDRESS}files`, formData, config);
        const locationHeader = res.headers["location"] || res.headers["Location"] || "";

        if (locationHeader) {
            return locationHeader.replace("/files/", "").trim();
        }

        return String(res.data || "")
            .replace("/files/", "")
            .trim();
    };

    const onApply = async () => {
        try {
            for (const id of deletedServerIds) {
                await api.delete(`${BACKEND_ADDRESS}files`, { params: { id } }).catch(() => null);
            }

            const finalLeftPayload = await processBannerList(leftBanners);
            const finalTopPayload = await processBannerList(topRightBanners);
            const finalBottomPayload = await processBannerList(bottomRightBanners);

            const levels = ["high", "mid", "low"];
            for (const level of levels) {
                const targetIsbn = books[level]?.isbn;
                const keyName = `recommend_isbn_${level}`;

                if (targetIsbn) {
                    await api.put(`${BACKEND_ADDRESS}adminsettings`, {
                        key: keyName,
                        value: targetIsbn
                    });
                } else {
                    await api.delete(`${BACKEND_ADDRESS}adminsettings`, {
                        params: { key: keyName }
                    });
                }
            }

            await api.put(`${BACKEND_ADDRESS}adminsettings`, {
                key: "mainPick",
                value: mainPick
            });

            if (finalLeftPayload.length > 0) {
                await api.put(`${BACKEND_ADDRESS}adminsettings`, {
                    key: "leftBanner",
                    value: finalLeftPayload.join(",")
                });
            } else {
                await api.delete(`${BACKEND_ADDRESS}adminsettings`, {
                    params: { key: "leftBanner" }
                });
            }

            if (finalTopPayload.length > 0) {
                await api.put(`${BACKEND_ADDRESS}adminsettings`, {
                    key: "topRightBanners",
                    value: finalTopPayload.join(",")
                });
            } else {
                await api.delete(`${BACKEND_ADDRESS}adminsettings`, {
                    params: { key: "topRightBanners" }
                });
            }

            if (finalBottomPayload.length > 0) {
                await api.put(`${BACKEND_ADDRESS}adminsettings`, {
                    key: "bottomRightBanners",
                    value: finalBottomPayload.join(",")
                });
            } else {
                await api.delete(`${BACKEND_ADDRESS}adminsettings`, {
                    params: { key: "bottomRightBanners" }
                });
            }

            alert("성공적으로 저장되었습니다!");
            setDeletedServerIds([]);
            window.location.reload();
        } catch (err) {
            console.error("저장 중 에러 발생:", err);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <Component>
            <Title>메인 페이지 관리</Title>

            {/* --- 도서 관리 섹션 --- */}
            <SubTitle description={"정기 추천 도서 관리"}>정기추천 책 관리</SubTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4 mr-5">
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
                                onClick={() => {
                                    setSearchModalLevel(level);
                                    setSearchQuery("");
                                    setSearchResults([]);
                                }}
                                className="flex items-center text-xs text-gray-400 hover:text-blue-500 transition-colors"
                            >
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

            <div className={"font-suite text-[0.8rem] text-gray-500 mb-8 mt-2 ml-4"}>
                홈화면에 뜨는 메인 추천글은 선택된 책의 고정된 추천글 중, 가장 최근의 것이
                게시됩니다.
            </div>

            {/* --- 배너 관리 섹션 --- */}
            <SubTitle>홈페이지 배너 관리</SubTitle>
            <div className="flex flex-col lg:flex-row ml-4 gap-1">
                {/* 좌측: 메인 배너 리스트 */}
                <div className="w-full lg:w-1/2">
                    <div className="font-suite text-gray-600 mb-3 font-bold">
                        좌측 메인 배너{" "}
                        <span className="font-normal text-xs text-gray-400 ml-2">
                            2100x1000 권장
                        </span>
                    </div>
                    <label className="w-full py-3 bg-white border border-purple-400 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-purple-50 transition-all mb-3 text-purple-600">
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            accept=".png, .jpg, .jpeg"
                            onChange={(e) => handleFileAdd(e, "left")}
                        />
                        <MdOutlineFileUpload size={20} className="mr-2" />
                        <span className="text-sm font-bold">메인 배너 추가</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                        {leftBanners.map((banner, i) => (
                            <div
                                key={(banner.id || "") + i}
                                className="p-2 border border-gray-200 rounded bg-white space-y-2"
                            >
                                <div className="flex items-center">
                                    {banner.previewUrl ? (
                                        <img
                                            alt={banner.file?.name}
                                            src={banner.previewUrl}
                                            className="w-24 h-12 object-cover rounded-sm mr-3"
                                        />
                                    ) : (
                                        <ServerImg
                                            fileId={banner.id!}
                                            alt="main-banner"
                                            className="w-24 h-12 object-cover rounded-sm mr-3"
                                            onLoadFileName={(name) =>
                                                handleFileNameLoaded("left", i, name)
                                            }
                                        />
                                    )}
                                    <span className="text-xs text-gray-500 flex-1 truncate font-bold">
                                        {banner.file
                                            ? banner.file.name
                                            : banner.originalName || banner.id}
                                    </span>
                                    <MdDelete
                                        onClick={() => removeFile("left", i)}
                                        className="text-gray-300 hover:text-red-500 cursor-pointer ml-2"
                                        size={20}
                                    />
                                </div>
                                <div className="flex items-center gap-1 bg-gray-50 border rounded px-2 py-1 text-xs">
                                    <MdLink className="text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        className="flex-1 bg-transparent outline-none text-gray-700"
                                        placeholder="클릭 시 이동할 URL"
                                        value={banner.linkUrl || ""}
                                        onChange={(e) =>
                                            handleLinkUrlChange("left", i, e.target.value)
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 우측: 상단/하단 배너 리스트 */}
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
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                            {topRightBanners.map((banner, i) => (
                                <div
                                    key={(banner.id || "") + i}
                                    className="p-2 border border-gray-200 rounded bg-white space-y-1.5"
                                >
                                    <div className="flex items-center">
                                        {banner.previewUrl ? (
                                            <img
                                                alt={banner.file?.name}
                                                src={banner.previewUrl}
                                                className="w-10 h-12 object-cover rounded-sm mr-2"
                                            />
                                        ) : (
                                            <ServerImg
                                                fileId={banner.id!}
                                                alt="top-banner"
                                                className="w-10 h-12 object-cover rounded-sm mr-2"
                                                onLoadFileName={(name) =>
                                                    handleFileNameLoaded("top", i, name)
                                                }
                                            />
                                        )}
                                        <span className="text-[11px] text-gray-500 flex-1 truncate font-bold">
                                            {banner.file
                                                ? banner.file.name
                                                : banner.originalName || banner.id}
                                        </span>
                                        <MdDelete
                                            onClick={() => removeFile("top", i)}
                                            className="text-gray-300 hover:text-red-500 cursor-pointer ml-1"
                                            size={18}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 border rounded px-2 py-0.5 text-[11px]">
                                        <MdLink className="text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent outline-none text-gray-700"
                                            placeholder="클릭 시 이동할 URL"
                                            value={banner.linkUrl || ""}
                                            onChange={(e) =>
                                                handleLinkUrlChange("top", i, e.target.value)
                                            }
                                        />
                                    </div>
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
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                            {bottomRightBanners.map((banner, i) => (
                                <div
                                    key={(banner.id || "") + i}
                                    className="p-2 border border-gray-200 rounded bg-white space-y-1.5"
                                >
                                    <div className="flex items-center">
                                        {banner.previewUrl ? (
                                            <img
                                                alt={banner.file?.name}
                                                src={banner.previewUrl}
                                                className="w-12 h-6 object-cover rounded-sm mr-2"
                                            />
                                        ) : (
                                            <ServerImg
                                                fileId={banner.id!}
                                                alt="bottom-banner"
                                                className="w-12 h-6 object-cover rounded-sm mr-2"
                                                onLoadFileName={(name) =>
                                                    handleFileNameLoaded("bottom", i, name)
                                                }
                                            />
                                        )}
                                        <span className="text-[11px] text-gray-500 flex-1 truncate font-bold">
                                            {banner.file
                                                ? banner.file.name
                                                : banner.originalName || banner.id}
                                        </span>
                                        <MdDelete
                                            onClick={() => removeFile("bottom", i)}
                                            className="text-gray-300 hover:text-red-500 cursor-pointer ml-1"
                                            size={18}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1 bg-gray-50 border rounded px-2 py-0.5 text-[11px]">
                                        <MdLink className="text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            className="flex-1 bg-transparent outline-none text-gray-700"
                                            placeholder="클릭 시 이동할 URL"
                                            value={banner.linkUrl || ""}
                                            onChange={(e) =>
                                                handleLinkUrlChange("bottom", i, e.target.value)
                                            }
                                        />
                                    </div>
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

            {/* --- 도서 검색 팝업 (모달) --- */}
            {searchModalLevel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg p-6 relative shadow-xl">
                        <button
                            onClick={() => setSearchModalLevel(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <MdClose size={24} />
                        </button>

                        <h3 className="text-lg font-bold mb-1">
                            {LEVEL_STYLES[searchModalLevel]?.label} 도서 검색
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            난이도가{" "}
                            <span className="font-bold text-blue-600">
                                [{LEVEL_STYLES[searchModalLevel]?.label}]
                            </span>
                            인 도서만 필터링됩니다.
                        </p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="책 제목 또는 저자 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearchBooks()}
                            />
                            <button
                                onClick={handleSearchBooks}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors"
                            >
                                <MdSearch size={18} /> 검색
                            </button>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 border-t pt-3">
                            {isSearching ? (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    검색 중...
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((book) => (
                                    <div
                                        key={book.isbn}
                                        onClick={() => handleSelectBook(book)}
                                        className="p-3 border rounded hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors"
                                    >
                                        <div>
                                            <div className="font-bold text-sm text-gray-800">
                                                {book.title}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {book.author} | {book.publisher}
                                            </div>
                                        </div>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            {book.isbn}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Component>
    );
}
