import { useEffect, useRef, useState } from "react";

import { MdSearch } from "react-icons/md";
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
    const [authorQuery, setAuthorQuery] = useState("");
    const [searchPage, setSearchPage] = useState(1);
    const [searchTotal, setSearchTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const submittedSearch = useRef({ query: "", author: "" });
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

    useEffect(() => () => searchController.current?.abort(), []);

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
        const { query, author } = reuseQuery
            ? submittedSearch.current
            : { query: searchQuery.trim(), author: authorQuery.trim() };
        if (!query) return;
        submittedSearch.current = { query, author };
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
        const result = await searchBookSources(query, controller.signal, { author, page });
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
                className="flex items-center p-4 border border-gray-200 rounded-md bg-white hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => {
                    setSelectedBook(item);
                }}
            >
                {/* customCoverImg 유무에 따른 이미지 컴포넌트 분기 */}
                <div className="w-15 h-20 overflow-hidden bg-blue-50 rounded flex items-center justify-center mr-4 shrink-0 border border-gray-200">
                    <BookCoverImage book={item} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
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
                        <span>{bookPublicationDate(item) || "출간일 미상"}</span>
                        <span className="mx-3">|</span>
                        <span>{item.isbn}</span>
                    </div>
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
            <Title>추천 책 관리</Title>
            <div className="mx-4 mt-2 mb-6 max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-4">
                <RecentRecommendations
                    onSelect={(book) => setSelectedBook({ ...book, dbExist: true })}
                />
            </div>
            <SubTitle description="책 제목 또는 ISBN으로 검색하고, 책 정보를 등록한 뒤 추천글을 작성할 수 있습니다.">
                책 검색
            </SubTitle>

            {/* 검색바 영역 */}
            <div className="flex flex-col justify-center items-center mb-5">
                <div className="flex items-center gap-4 w-[80%]">
                    <div className="relative w-full md:w-120">
                        <input
                            type="text"
                            className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-full font-suite outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="책 제목 또는 ISBN"
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

                <div className="mt-3 w-[80%]">
                    <label className="font-suite text-sm text-gray-600">
                        저자명 <span className="text-gray-400">(선택)</span>
                        <input
                            value={authorQuery}
                            onChange={(e) => setAuthorQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="예: 백은별"
                            maxLength={200}
                            className="ml-3 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-gray-700"
                        />
                    </label>
                    <p className="mt-2 font-suite text-xs text-gray-500">
                        제목과 저자명을 나누어 입력하면 동명 작품을 쉽게 찾을 수 있습니다.
                    </p>
                </div>

                <div className="flex items-center ml-5 mt-2 w-[80%]">
                    <input
                        type="checkbox"
                        id="excludeCheckbox"
                        checked={exclude}
                        onChange={() => setExclude(!exclude)}
                    />
                    <label
                        htmlFor="excludeCheckbox"
                        className="ml-2 font-suite text-sm text-gray-500 cursor-pointer"
                    >
                        한 번도 추천하지 않은 책만 검색
                    </label>
                </div>
            </div>

            {(searchErrors.registered || searchErrors.external) && (
                <div
                    role="alert"
                    className="mx-4 my-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-suite text-sm text-amber-900"
                >
                    {searchErrors.registered && <p>등록된 책 검색: {searchErrors.registered}</p>}
                    {searchErrors.external && <p>국립중앙도서관 검색: {searchErrors.external}</p>}
                </div>
            )}
            <div aria-busy={isSearching} className="ml-4 my-4 space-y-3 mr-4">
                {searchResults_l.length > 0 || searchResults_a.length > 0 ? (
                    <>
                        {!exclude && !searchErrors.registered && (
                            <>
                                <div className="w-full text-[0.9rem] font-suite pl-2 mt-3">
                                    등록된 책{searchResults_l.length > 0 ? "" : "이 없습니다"}
                                </div>
                                {renderSearchResults(searchResults_l)}
                            </>
                        )}

                        {!searchErrors.external && (
                            <>
                                <div className="w-full text-[0.9rem] font-suite pl-2 mt-3">
                                    국립중앙도서관 검색 결과
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
                                        ? "검색 결과가 없습니다. 책 이름을 정확히 입력해주세요."
                                        : "책 제목 또는 ISBN을 입력하고 검색해 주세요."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {searchedQuery &&
                !searchErrors.external &&
                !isSearching &&
                (searchTotal > 0 || searchPage > 1) && (
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
                            {searchPage.toLocaleString()}페이지 · 전체{" "}
                            {searchTotal.toLocaleString()}건
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
            <Title>책 추천하기</Title>
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
