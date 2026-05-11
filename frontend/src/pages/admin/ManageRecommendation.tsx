import { useState, useEffect } from "react";
import { MdSearch, MdEdit, MdAdd, MdLibraryBooks, MdHistory } from "react-icons/md";
import axios from "axios";

import { BACKEND_ADDRESS } from "../../App";
import Component, { Title, SubTitle } from "./lib_component/Component";

interface Recommendation {
    id: number;
    bookTitle: string;
    author: string;
    recommendationTitle: string;
    createdAt: string;
}

export default function ManageRecommendation() {
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [searchResults, setSearchResults] = useState<Recommendation[]>([]);
    const [recentRecommendations, setRecentRecommendations] = useState<Recommendation[]>([
        {
            id: 3,
            bookTitle: "노르웨이의 숲",
            author: "무라카미 하루키",
            recommendationTitle: "상실의 시대를 살아가는 우리에게",
            createdAt: "2026-05-10"
        }
    ]);
    const [isSearching, setIsSearching] = useState(false);

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
            const res = await axios.get(`${BACKEND_ADDRESS}recommendations/search`, {
                params: { query: searchQuery },
                headers: { "X-Client-Session-ID": localStorage.getItem("wca_token") }
            });
            setSearchResults(res.data);
        } catch (err) {
            console.error(err);
            setSearchResults(
                [
                    {
                        id: 1,
                        bookTitle: "용의자 X의 헌신",
                        author: "히가시노 게이고",
                        recommendationTitle: "천재 수학자의 완벽한 알리바이",
                        createdAt: "2026-04-01"
                    },
                    {
                        id: 2,
                        bookTitle: "용의자 X의 헌신",
                        author: "히가시노 게이고",
                        recommendationTitle: "사랑이 사람을 어디까지 바꿀 수 있는가",
                        createdAt: "2026-04-05"
                    },
                    {
                        id: 3,
                        bookTitle: "노르웨이의 숲",
                        author: "무라카미 하루키",
                        recommendationTitle: "상실의 시대를 살아가는 우리에게",
                        createdAt: "2026-05-10"
                    }
                ].filter((item) => item.bookTitle.includes(searchQuery))
            );
        } finally {
            setIsSearching(false);
        }
    };

    const renderSearchResults = (list: Recommendation[], highlight?: boolean) => {
        return list.map((item) => (
            <div
                key={item.id}
                className="flex items-center p-4 border border-gray-200 rounded-md bg-white hover:shadow-md transition-shadow group"
            >
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mr-4 shrink-0">
                    <MdLibraryBooks size={24} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">
                            {highlight
                                ? highlightText(item.recommendationTitle, searchQuery)
                                : item.recommendationTitle}
                        </span>
                        <span className="text-[0.7rem] px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-suite">
                            ID: {item.id}
                        </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-600 mr-2">
                            {highlight
                                ? highlightText(item.bookTitle, searchQuery)
                                : item.bookTitle}
                        </span>
                        <span className="mr-3">|</span>
                        <span>{item.author}</span>
                        <span className="ml-auto flex items-center text-gray-400 text-xs">
                            <MdHistory className="mr-1" /> {item.createdAt}
                        </span>
                    </div>
                </div>

                <button
                    className="ml-6 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
                    onClick={() => alert(`${item.id}번 글 수정 페이지로 이동 ㅋ`)}
                >
                    <MdEdit size={22} />
                </button>
            </div>
        ));
    };

    return (
        <Component>
            <Title>추천 책 관리</Title>
            {/* 검색바 영역 */}
            <div className="flex flex-col md:flex-row items-center gap-4 ml-4 mb-8">
                <div className="relative w-full md:w-120">
                    <input
                        type="text"
                        className="w-full h-12 pl-12 pr-4 border border-gray-300 rounded-full font-suite outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="등록된 책 이름으로 검색"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchResults([]);
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
                <button
                    className="h-12 px-6 bg-blue-600 text-white rounded-lg font-bold flex items-center hover:bg-blue-700 transition-all ml-4 cursor-pointer"
                    onClick={() => alert("새 추천글 작성 페이지로 이동 ㅋ")}
                >
                    <MdAdd size={22} className="mr-1" /> 새 추천글 작성
                </button>
            </div>
            <SubTitle description={"책 이름을 검색하여 등록된 글을 관리하세요."}>
                검색 결과
            </SubTitle>
            <div className="ml-4 my-4 space-y-3">
                {searchResults.length > 0 ? (
                    renderSearchResults(searchResults, true)
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

            <SubTitle>최근 작성한 추천글</SubTitle>
            <div className={"mt-2"}>
                {recentRecommendations.length > 0 ? (
                    <div className={"mr-4"}>{renderSearchResults(recentRecommendations)}</div>
                ) : (
                    <span className={"font-suite text-gray-400 ml-4"}>
                        최근 작성한 글이 없습니다.
                    </span>
                )}
            </div>
        </Component>
    );
}
