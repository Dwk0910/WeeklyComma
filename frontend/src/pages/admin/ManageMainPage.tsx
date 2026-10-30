import React, { useState, useEffect } from "react";
import { MdOutlineFileUpload, MdCheckCircle, MdCached, MdDelete, MdLink } from "react-icons/md";

import { BACKEND_ADDRESS, api } from "../../index.tsx";
import SubmitButton from "./lib_component/SubmitButton.tsx";
import Component, { Title, SubTitle } from "./lib_component/Component";
import ServerImg from "../../component/ServerImg.tsx";
import { isAxiosError } from "axios";
import RecommendationPicker from "./recommendations/RecommendationPicker.tsx";
import {
    plainText,
    type Course,
    type RecommendationBook,
    type RecommendationPost,
    type RecommendationSettings
} from "./recommendations/types.ts";

const LEVEL_STYLES: Record<string, { label: string; color: string }> = {
    high: { label: "상급", color: "bg-red-600" },
    mid: { label: "중급", color: "bg-yellow-500" },
    low: { label: "초급", color: "bg-blue-600" }
};

type BannerItem = {
    id?: string;
    originalName?: string;
    file?: File;
    previewUrl?: string;
    linkUrl?: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const fetchAdminSetting = async (key: string): Promise<string | null> => {
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

export default function ManageMainPage() {
    const [books, setBooks] = useState<Record<Course, RecommendationBook | null>>({
        high: null,
        mid: null,
        low: null
    });
    const [mainPick, setMainPick] = useState<Course>("high");
    const [selectedPosts, setSelectedPosts] = useState<Partial<Record<Course, RecommendationPost>>>(
        {}
    );
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [settingsError, setSettingsError] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [leftBanners, setLeftBanners] = useState<BannerItem[]>([]);
    const [topRightBanners, setTopRightBanners] = useState<BannerItem[]>([]);
    const [bottomRightBanners, setBottomRightBanners] = useState<BannerItem[]>([]);

    const [searchModalLevel, setSearchModalLevel] = useState<Course | null>(null);

    const [deletedServerIds, setDeletedServerIds] = useState<string[]>([]);

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
        let cancelled = false;
        const fetchInitialData = async () => {
            try {
                const response = await api.get<RecommendationSettings>(
                    "adminsettings/recommendations"
                );
                const loadedBooks: Record<Course, RecommendationBook | null> = {
                    high: null,
                    mid: null,
                    low: null
                };
                const loadedPosts: Partial<Record<Course, RecommendationPost>> = {};
                await Promise.all(
                    response.data.selections.map(async (selection) => {
                        const bookResponse = await api.get<RecommendationBook>(
                            `books/${encodeURIComponent(selection.isbn)}`
                        );
                        loadedBooks[selection.course] = bookResponse.data;
                        if (selection.postId) {
                            try {
                                const postResponse = await api.get<RecommendationPost>(
                                    `posts/${selection.postId}`
                                );
                                if (postResponse.data.attributions?.bookId === selection.isbn)
                                    loadedPosts[selection.course] = postResponse.data;
                            } catch {
                                // An incomplete legacy selection must be repaired before saving.
                            }
                        }
                    })
                );
                if (cancelled) return;
                setBooks(loadedBooks);
                setSelectedPosts(loadedPosts);
                setMainPick(
                    response.data.mainPick || response.data.selections[0]?.course || "high"
                );
                const [left, top, bottom] = await Promise.all(
                    ["leftBanner", "topRightBanners", "bottomRightBanners"].map(async (key) => {
                        const setting = await api.get("adminsettings", { params: { key } });
                        return setting.data == null ? null : String(setting.data);
                    })
                );
                if (cancelled) return;
                if (left) setLeftBanners(parseBannerData(left));
                if (top) setTopRightBanners(parseBannerData(top));
                if (bottom) setBottomRightBanners(parseBannerData(bottom));
            } catch {
                if (!cancelled)
                    setSettingsError(
                        "현재 선정 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."
                    );
            } finally {
                if (!cancelled) setIsLoadingSettings(false);
            }
        };
        void fetchInitialData();
        return () => {
            cancelled = true;
        };
    }, []);

    const clearSelection = (course: Course) => {
        setBooks((previous) => ({ ...previous, [course]: null }));
        setSelectedPosts((previous) => {
            const next = { ...previous };
            delete next[course];
            return next;
        });
        if (mainPick === course) {
            const next = (Object.keys(books) as Course[]).find(
                (other) => other !== course && books[other]
            );
            setMainPick(next || "high");
        }
    };

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
        if (isSaving || isLoadingSettings || settingsError) return;
        const selections: RecommendationSettings["selections"] = [];
        for (const course of Object.keys(books) as Course[]) {
            const book = books[course];
            if (!book) continue;
            const post = selectedPosts[course];
            if (!post || post.attributions?.bookId !== book.isbn) {
                alert("추천 도서와 연결할 추천글을 함께 선택해 주세요.");
                setSearchModalLevel(course);
                return;
            }
            selections.push({ course, isbn: book.isbn, postId: post.id });
        }
        const savedMainPick = selections.some((selection) => selection.course === mainPick)
            ? mainPick
            : selections[0]?.course || null;
        setIsSaving(true);
        try {
            for (const id of deletedServerIds) {
                await api.delete(`${BACKEND_ADDRESS}files`, { params: { id } }).catch(() => null);
            }

            const finalLeftPayload = await processBannerList(leftBanners);
            const finalTopPayload = await processBannerList(topRightBanners);
            const finalBottomPayload = await processBannerList(bottomRightBanners);

            await api.put("adminsettings/recommendations", { selections, mainPick: savedMainPick });

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
            alert(
                isAxiosError(err)
                    ? err.response?.data?.message || "저장 중 오류가 발생했습니다."
                    : "저장 중 오류가 발생했습니다."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Component>
            <Title>메인 페이지 관리</Title>
            {isLoadingSettings && (
                <p role="status" className="text-sm text-gray-500 ml-4">
                    현재 설정을 불러오는 중입니다.
                </p>
            )}
            {settingsError && (
                <p role="alert" className="text-sm text-red-600 ml-4">
                    {settingsError}
                </p>
            )}
            {isSaving && (
                <p role="status" className="text-sm text-blue-600 ml-4">
                    설정을 저장하고 있습니다.
                </p>
            )}

            {/* --- 도서 관리 섹션 --- */}
            <SubTitle description={"정기 추천 도서 관리"}>정기추천 책 관리</SubTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-4 mr-5">
                {(Object.keys(books) as Course[]).map((level) => (
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
                            <div
                                className="absolute cursor-pointer left-18"
                                onClick={() => books[level] && setMainPick(level)}
                            >
                                <MdCheckCircle
                                    size={26}
                                    className={
                                        mainPick === level ? "text-blue-500" : "text-gray-200"
                                    }
                                />
                            </div>
                            <button
                                disabled={isLoadingSettings || !!settingsError || isSaving}
                                onClick={() => setSearchModalLevel(level)}
                                className="flex items-center text-xs text-gray-400 hover:text-blue-500 transition-colors"
                            >
                                <MdCached size={16} className="mr-1" /> 교체
                            </button>
                        </div>
                        <div
                            className="cursor-pointer"
                            onClick={() => books[level] && setMainPick(level)}
                        >
                            <div className="font-bold text-xl text-gray-800">
                                {plainText(books[level]?.title) || "책 미설정"}
                            </div>
                            <div className="text-gray-500 mt-1 text-[0.8rem]">
                                {plainText(books[level]?.author) || "-"}
                            </div>
                        </div>
                        <div className="mt-4 text-sm">
                            <div className="font-semibold text-gray-600 mb-1">연결된 추천글</div>
                            <div
                                className={
                                    books[level] && !selectedPosts[level]
                                        ? "text-red-500"
                                        : "text-gray-700"
                                }
                            >
                                {plainText(selectedPosts[level]?.title) ||
                                    (books[level]
                                        ? "교체 창에서 추천글을 함께 선택해 주세요."
                                        : "미선정")}
                            </div>
                            {books[level] && (
                                <button
                                    type="button"
                                    onClick={() => clearSelection(level)}
                                    disabled={isSaving}
                                    className="text-xs text-gray-400 hover:text-red-500 underline mt-3"
                                >
                                    선정 해제
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className={"font-suite text-[0.8rem] text-gray-500 mb-8 mt-2 ml-4"}>
                교체 창에서 도서와 추천글을 함께 선택합니다. 작성 주차에 따른 제한은 없습니다.
                주차가 바뀌면 현재 선정 정보는 이력으로 저장되고 초기화됩니다.
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

            {searchModalLevel && (
                <RecommendationPicker
                    course={searchModalLevel}
                    initialBook={books[searchModalLevel]}
                    initialPostId={selectedPosts[searchModalLevel]?.id}
                    onClose={() => setSearchModalLevel(null)}
                    onSelect={(book, post) => {
                        const course = searchModalLevel;
                        setBooks((previous) => ({ ...previous, [course]: book }));
                        setSelectedPosts((previous) => ({ ...previous, [course]: post }));
                        if (!books[mainPick]) setMainPick(course);
                        setSearchModalLevel(null);
                    }}
                />
            )}
        </Component>
    );
}
