import { useState, useEffect } from "react";

import { MdSearch } from "react-icons/md";
import { GoArrowLeft } from "react-icons/go";

import { BACKEND_ADDRESS, api } from "../../../index.tsx";
import Component, { Title, SubTitle } from "../lib_component/Component";
import ManageBook from "./ManageBook.tsx";

export type Book = {
    title: string;
    subtitle: string;
    description: string;
    author: string;
    publisher: string;
    isbn: string;
    pubDate: number;
    coverImg: string;
    customCoverImg: string | null;
    adult: boolean;
    difficulty: "초급" | "중급" | "상급" | null;
    // recommendations: Recommendation[];
    dbExist: boolean;
};

// interface Recommendation {
//     title: string;
//     createdAt: string;
// }
//
export default function ManageRecommendation() {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults_l, setSearchResults_l] = useState<Book[]>([]);
    const [searchResults_a, setSearchResults_a] = useState<Book[]>([]);
    // const [recentRecommendations, setRecentRecommendations] = useState<Recommendation[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>();
    const [exclude, setExclude] = useState<boolean>(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>();

    useEffect(() => {
        // TODO: 페이지가 처음 로드될 때 최근 작성한 추천글 5개를 불러오는 API 호출
    }, []);

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;
        const parts = text.split(new RegExp(`(${query})`, "gi"));
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

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            setSearchResults_l(
                (
                    (
                        await api.get(BACKEND_ADDRESS + "books", {
                            params: { query: searchQuery }
                        })
                    ).data as Book[]
                ).map((i) => ({ ...i, dbExist: true }))
            );

            setSearchResults_a(
                (
                    await api.get(BACKEND_ADDRESS + "books/api", {
                        params: { query: searchQuery }
                    })
                ).data
            );
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
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
                <div className="w-15 h-17 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-4 shrink-0">
                    <img alt={"bookcover"} src={item.coverImg} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
                            {highlightText(item.title, searchQuery)}
                        </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-600 mr-2">{item.author}</span>
                        <span className="mr-3">|</span>
                        <span className="font-semibold text-gray-600 mr-3">{item.publisher}</span>
                        <span className="mr-3">|</span>
                        {(() => {
                            const date: Date = new Date(item.pubDate * 1000);
                            return (
                                <span>{`${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDay()}.`}</span>
                            );
                        })()}
                        <span className="mx-3">|</span>
                        <span>{item.isbn}</span>
                    </div>
                </div>
            </div>
        ));
    };

    return selectedBook == null ? (
        <Component>
            <Title>추천 책 관리</Title>
            <SubTitle
                description={
                    "책의 이름을 검색하여 새로운 추천 글을 작성하거나 작성한 글을 수정할 수 있습니다."
                }
            >
                책 검색
            </SubTitle>
            {/* 검색바 영역 */}
            <div className="flex flex-col justify-center items-center mb-5">
                <div className="flex items-center gap-4 w-[80%]">
                    <div className="relative w-full md:w-120">
                        <input
                            type="text"
                            className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-full font-suite outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="키워드로 검색 (저자, 도서 이름 등)"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <MdSearch
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={24}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="h-12 px-8 bg-gray-800 text-white rounded-full font-bold hover:bg-black transition-all cursor-pointer"
                    >
                        검색
                    </button>
                    {/*<button className="h-12 px-6 bg-blue-600 text-white rounded-lg font-bold flex items-center hover:bg-blue-700 transition-all ml-4 cursor-pointer">*/}
                    {/*    <MdAdd size={22} className="mr-1" /> 새 추천글 작성*/}
                    {/*</button>*/}
                </div>
                <div className={"flex items-center ml-5 mt-2 w-[80%]"}>
                    <input
                        type={"checkbox"}
                        id={"excludeCheckbox"}
                        checked={exclude}
                        onChange={() => setExclude(!exclude)}
                    />
                    <label
                        htmlFor={"excludeCheckbox"}
                        className={"ml-2 font-suite text-sm text-gray-500"}
                    >
                        한 번도 추천하지 않은 책만 검색
                    </label>
                </div>
            </div>
            <div className="ml-4 my-4 space-y-3 mr-4">
                {searchResults_l.length > 0 || searchResults_a.length > 0 ? (
                    <>
                        {!exclude && (
                            <>
                                <div className={"w-full text-[0.9rem] font-suite pl-2 mt-3"}>
                                    등록된 책{searchResults_l.length > 0 ? "" : "이 없습니다"}
                                </div>
                                {renderSearchResults(searchResults_l)}
                            </>
                        )}

                        <div className={"w-full text-[0.9rem] font-suite pl-2 mt-3"}>
                            등록되지 않은 책
                        </div>
                        {renderSearchResults(
                            searchResults_a.filter(
                                (item) => !searchResults_l.some((il) => il.isbn === item.isbn)
                            )
                        )}
                    </>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                        <div className={"flex items-center"}>
                            <MdSearch size={40} className="text-gray-200 mr-4" />
                            <p className="text-gray-400 font-suite">
                                {isSearching
                                    ? "검색 중..."
                                    : "검색 결과가 없습니다. 책 이름을 정확히 입력해주세요."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/*<SubTitle>최근 작성한 추천글</SubTitle>*/}
            {/*<div className={"mt-2"}>*/}
            {/*    {recentRecommendations.length > 0 ? (*/}
            {/*        <div className={"mr-4"}>{renderSearchResults(recentRecommendations)}</div>*/}
            {/*    ) : (*/}
            {/*        <span className={"font-suite text-gray-400 ml-4"}>*/}
            {/*            최근 작성한 글이 없습니다.*/}
            {/*        </span>*/}
            {/*    )}*/}
            {/*</div>*/}
        </Component>
    ) : (
        <Component>
            <div
                className={"flex items-center mt-5 -mb-2 hover:underline cursor-pointer w-30"}
                onClick={() => setSelectedBook(null)}
            >
                <GoArrowLeft size={25} />
                <span className={"font-suite text-gray-500 ml-2 text-[1.2rem] inline"}>
                    돌아가기
                </span>
            </div>
            <Title>책 추천하기</Title>
            <ManageBook book={selectedBook} />
        </Component>
    );
}
