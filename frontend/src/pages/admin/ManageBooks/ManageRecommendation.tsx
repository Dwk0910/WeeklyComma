import { useEffect, useRef, useState } from "react";

import { api } from "../../../lib/api.ts";
import { MEDIA_LABELS, mediaLabel, coverAspect, type MediaType } from "../../../types/book.ts";
import { MdSearch, MdExpandMore } from "react-icons/md";
import { GoArrowLeft } from "react-icons/go";

import { searchBookSources, type ManagedBook } from "../../../lib/bookSearch.ts";
import Component, { Title, SubTitle } from "../lib_component/Component";
import ManageBook from "./ManageBook.tsx";
import BookCoverImage from "../../../component/BookCoverImage.tsx";
import { bookPublicationDate, comparableIsbn } from "../../../lib/bookDetails.ts";
import RecentRecommendations from "../recommendations/RecentRecommendations.tsx";

export type Book = ManagedBook;

export default function ManageRecommendation() {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [mediaType, setMediaType] = useState<MediaType>("BOOK");
    const [selecting, setSelecting] = useState(false);
    const [selectionError, setSelectionError] = useState("");
    const selectionController = useRef<AbortController | null>(null);
    const [authorQuery, setAuthorQuery] = useState("");
    const [searchPage, setSearchPage] = useState(1);
    const [searchTotal, setSearchTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const submittedSearch = useRef({
        query: "",
        author: "",
        mediaType: "BOOK" as MediaType
    });
    const [searchResults_l, setSearchResults_l] = useState<Book[]>([]);
    const [searchResults_a, setSearchResults_a] = useState<Book[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [exclude, setExclude] = useState<boolean>(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [searchedQuery, setSearchedQuery] = useState("");
    const [searchErrors, setSearchErrors] = useState<{
        registered: string | null;
        external: string | null;
    }>({ registered: null, external: null });
    const searchController = useRef<AbortController | null>(null);

    useEffect(
        () => () => {
            searchController.current?.abort();
            selectionController.current?.abort();
        },
        []
    );

    const changeCategory = (type: MediaType) => {
        searchController.current?.abort();
        selectionController.current?.abort();
        setSelecting(false);
        setSelectionError("");
        setIsSearching(false);
        setMediaType(type);
        setAuthorQuery("");
        setSearchResults_l([]);
        setSearchResults_a([]);
        setSearchedQuery("");
        setSearchErrors({ registered: null, external: null });
        setHasMore(false);
    };
    const selectItem = async (item: Book) => {
        selectionController.current?.abort();
        const controller = new AbortController();
        selectionController.current = controller;
        setSelectionError("");
        setSelecting(false);
        if (item.source !== "TMDB" || item.dbExist) {
            setSelectedBook(item);
            return;
        }
        setSelecting(true);
        try {
            const response = await api.get<Book>("books/api/details", {
                params: { source: item.source, sourceId: item.sourceId },
                signal: controller.signal
            });
            if (!controller.signal.aborted)
                setSelectedBook({ ...response.data, dbExist: item.dbExist });
        } catch {
            if (!controller.signal.aborted)
                setSelectionError("상세 정보를 가져오지 못했습니다. 자료를 다시 선택해 주세요.");
        } finally {
            if (!controller.signal.aborted) setSelecting(false);
        }
    };

    // HTML Entity decoding utility
    const decodeHtml = (html: string | undefined | null) => {
        if (!html) return "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        return doc.documentElement.textContent || "";
    };

    const highlightText = (text: string, query: string) => {
        const decoded = decodeHtml(text);
        if (!query.trim()) return decoded;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = decoded.split(new RegExp(`(${escaped})`, "gi"));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <span key={i} className="text-blue-600 font-bold">
                            {part}
                        </span>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    const handleSearch = async (page = 1, reuseQuery = false) => {
        const criteria = reuseQuery
            ? submittedSearch.current
            : {
                  query: searchQuery.trim(),
                  author: mediaType === "BOOK" || mediaType === "MUSIC" ? authorQuery.trim() : "",
                  mediaType
              };
        const { query, author } = criteria;
        if (!query) return;
        selectionController.current?.abort();
        setSelecting(false);
        setSelectionError("");
        submittedSearch.current = criteria;
        searchController.current?.abort();
        const controller = new AbortController();
        searchController.current = controller;
        setSearchedQuery(query);
        setIsSearching(true);
        setSearchPage(page);
        setHasMore(false);
        setSearchResults_l([]);
        setSearchResults_a([]);
        setSearchErrors({ registered: null, external: null });
        const result = await searchBookSources(query, controller.signal, {
            author,
            page,
            mediaType: criteria.mediaType
        });
        if (controller.signal.aborted) return;
        setSearchResults_l(result.registered);
        setSearchResults_a(result.external);
        setSearchErrors(result.errors);
        setSearchTotal(result.total);
        setHasMore(result.hasMore);
        setIsSearching(false);
    };

    const renderSearchResults = (list: Book[]) => {
        return list.map((item) => (
            <div
                key={item.isbn}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void selectItem(item);
                    }
                }}
                className="flex items-center p-4 border border-gray-200 rounded-md bg-white hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => {
                    void selectItem(item);
                }}
            >
                {/* customCoverImg 유무에 따른 이미지 컴포넌트 분기 */}
                <div
                    style={{ aspectRatio: coverAspect(item) }}
                    className="w-15 overflow-hidden bg-blue-50 rounded flex items-center justify-center mr-4 shrink-0 border border-gray-200"
                >
                    <BookCoverImage book={item} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
                            <span className="mr-2 rounded bg-stone-100 px-2 py-1 text-xs font-normal">
                                {mediaLabel(item)}
                            </span>
                            {highlightText(item.title, searchedQuery)}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-y-1 text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-600 mr-2">
                            {decodeHtml(item.author)}
                        </span>
                        <span className="mr-3">|</span>
                        <span className="font-semibold text-gray-600 mr-3">
                            {decodeHtml(item.publisher)}
                        </span>
                        <span className="mr-3">|</span>
                        <span>{bookPublicationDate(item) || "공개일 미상"}</span>
                        <span className="mx-3">|</span>
                        <span>{item.isbn}</span>
                    </div>
                    {item.albumTitle && (
                        <p className="mt-1 text-sm text-stone-500">수록 앨범 · {item.albumTitle}</p>
                    )}
                    {[item.pageCount, item.bookSize, item.edition, item.seriesTitle].some(
                        Boolean
                    ) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-stone-600">
                            {[item.pageCount, item.bookSize, item.edition, item.seriesTitle]
                                .filter(Boolean)
                                .map((value, index) => (
                                    <span key={index} className="rounded bg-stone-100 px-2 py-1">
                                        {decodeHtml(value)}
                                    </span>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        ));
    };

    return selectedBook == null ? (
        <Component>
            <Title>추천 자료 관리</Title>
            <div className="mx-4 mt-2 mb-6 max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-4">
                <RecentRecommendations
                    onSelect={(book) => setSelectedBook({ ...book, dbExist: true })}
                />
            </div>
            <SubTitle description="책·음악·드라마·영화를 검색하고 등록한 뒤 추천글을 작성할 수 있습니다.">
                자료 검색
            </SubTitle>

            <div className="mx-auto mb-5 flex w-[80%] flex-wrap gap-2" aria-label="자료 유형">
                {(Object.keys(MEDIA_LABELS) as MediaType[]).map((type) => (
                    <button
                        key={type}
                        aria-pressed={mediaType === type}
                        onClick={() => changeCategory(type)}
                        className={`rounded-full border px-5 py-2 font-suite text-sm transition-colors ${mediaType === type ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
                    >
                        {MEDIA_LABELS[type]}
                    </button>
                ))}
            </div>
            {selecting && (
                <p role="status" className="mx-4 font-suite">
                    상세 정보를 가져오는 중…
                </p>
            )}
            {selectionError && (
                <p role="alert" className="mx-4 text-red-700">
                    {selectionError}
                </p>
            )}
            {/* 검색바 영역 */}
            <div className="flex flex-col justify-center items-center mb-5">
                <div className="flex items-center gap-4 w-[80%]">
                    <div className="relative w-full md:w-120">
                        <input
                            type="text"
                            className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-full font-suite outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder={mediaType === "BOOK" ? "책 제목 또는 ISBN" : "작품 제목"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <MdSearch
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={24}
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        className="h-12 px-8 bg-gray-800 text-white rounded-full font-bold hover:bg-black transition-all cursor-pointer"
                    >
                        검색
                    </button>
                </div>

                <details className="group mt-4 w-[80%] border-t border-stone-200 font-suite">
                    <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm text-stone-600 [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500">
                        <MdExpandMore
                            className="transition-transform duration-200 group-open:rotate-180"
                            size={20}
                            aria-hidden="true"
                        />
                        상세 검색
                        {(authorQuery.trim() || exclude) && (
                            <span className="ml-auto text-xs text-stone-500">
                                {[
                                    (mediaType === "BOOK" || mediaType === "MUSIC") &&
                                    authorQuery.trim()
                                        ? `${mediaType === "MUSIC" ? "아티스트" : "저자"}: ${authorQuery.trim()}`
                                        : "",
                                    exclude ? "외부 결과만" : ""
                                ]
                                    .filter(Boolean)
                                    .join(" · ")}
                            </span>
                        )}
                    </summary>
                    <div className="space-y-4 pb-4 pt-1 text-sm text-stone-600">
                        {(mediaType === "BOOK" || mediaType === "MUSIC") && (
                            <label className="flex flex-wrap items-center gap-3">
                                {mediaType === "MUSIC" ? "아티스트" : "저자명"}
                                <input
                                    value={authorQuery}
                                    onChange={(e) => setAuthorQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder={
                                        mediaType === "MUSIC"
                                            ? "예: 아이유 (선택)"
                                            : "예: 백은별 (선택)"
                                    }
                                    maxLength={200}
                                    className="min-w-0 rounded-lg border border-stone-200 bg-transparent px-3 py-2 outline-none focus:border-stone-600"
                                />
                            </label>
                        )}
                        {mediaType === "MUSIC" && (
                            <p className="text-xs text-stone-500">
                                곡 제목과 앨범 제목을 함께 검색합니다.
                            </p>
                        )}
                        <label className="flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={exclude}
                                onChange={() => setExclude(!exclude)}
                                className="accent-stone-700"
                            />
                            외부 검색 결과만 보기
                        </label>
                    </div>
                </details>
            </div>

            {(searchErrors.registered || searchErrors.external) && (
                <div
                    role="alert"
                    className="mx-4 my-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-suite text-sm text-amber-900"
                >
                    {searchErrors.registered && <p>등록된 자료 검색: {searchErrors.registered}</p>}
                    {searchErrors.external && <p>외부 자료 검색: {searchErrors.external}</p>}
                </div>
            )}
            <div aria-busy={isSearching} className="ml-4 my-4 space-y-3 mr-4">
                {searchResults_l.length > 0 || searchResults_a.length > 0 ? (
                    <>
                        {!exclude && !searchErrors.registered && (
                            <>
                                <div className="w-full text-[0.9rem] font-suite pl-2 mt-3">
                                    등록된 자료{searchResults_l.length > 0 ? "" : "이 없습니다"}
                                </div>
                                {renderSearchResults(searchResults_l)}
                            </>
                        )}

                        {!searchErrors.external && (
                            <>
                                <div className="w-full text-[0.9rem] font-suite pl-2 mt-3">
                                    외부 검색 결과
                                </div>
                                {renderSearchResults(
                                    searchResults_a.filter(
                                        (item) =>
                                            !searchResults_l.some(
                                                (il) =>
                                                    comparableIsbn(il.isbn) ===
                                                    comparableIsbn(item.isbn)
                                            )
                                    )
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                        <div className="flex items-center">
                            <MdSearch size={40} className="text-gray-200 mr-4" />
                            <p className="text-gray-400 font-suite">
                                {isSearching
                                    ? "검색 중..."
                                    : searchErrors.registered || searchErrors.external
                                      ? "검색을 완료하지 못했습니다. 위 안내를 확인해 주세요."
                                      : searchedQuery
                                        ? "검색 결과가 없습니다. 다른 검색어로 검색해 주세요."
                                        : "자료 제목을 입력하고 검색해 주세요."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {searchedQuery &&
                !searchErrors.external &&
                !isSearching &&
                (searchTotal > 0 || hasMore || searchPage > 1) && (
                    <nav
                        aria-label="외부 도서 검색 페이지"
                        className="mx-4 mb-6 flex items-center justify-center gap-5 font-suite text-sm"
                    >
                        <button
                            disabled={searchPage <= 1}
                            onClick={() => handleSearch(searchPage - 1, true)}
                            className="rounded-full border px-4 py-2 disabled:opacity-30"
                        >
                            이전
                        </button>
                        <span>
                            {searchPage.toLocaleString()}페이지
                            {searchTotal >= 0 && ` · 전체 ${searchTotal.toLocaleString()}건`}
                        </span>
                        <button
                            disabled={!hasMore}
                            onClick={() => handleSearch(searchPage + 1, true)}
                            className="rounded-full border px-4 py-2 disabled:opacity-30"
                        >
                            다음
                        </button>
                    </nav>
                )}
        </Component>
    ) : (
        <Component>
            <div
                className="flex items-center mt-5 -mb-2 hover:underline cursor-pointer w-30"
                onClick={() => setSelectedBook(null)}
            >
                <GoArrowLeft size={25} />
                <span className="font-suite text-gray-500 ml-2 text-[1.2rem] inline">돌아가기</span>
            </div>
            <Title>자료 추천하기</Title>
            <ManageBook
                setSelectedBook={setSelectedBook}
                book={selectedBook}
                refreshSearchResult={async () => {
                    await handleSearch();
                }}
            />
        </Component>
    );
}
