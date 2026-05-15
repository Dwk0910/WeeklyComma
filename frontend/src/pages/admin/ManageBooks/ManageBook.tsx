import { type Book } from "./ManageRecommendation.tsx";

import FontStyle from "../../../assets/fonts/fonts.tsx";

export default function ManageBook({ book }: { book: Book }) {
    return (
        <>
            <FontStyle />
            <div className={"flex"}>
                <img
                    src={book.coverImg}
                    alt={"cover"}
                    className={"w-60 shrink-0 border border-gray-500"}
                />
                <div className={"ml-4 flex flex-col"}>
                    <div className={"-mt-2 text-[1.8rem] font-[HCRBatang] font-bold"}>
                        {book.title}
                    </div>
                    {book.subtitle && (
                        <div className={"ml-3 -mt-1 font-suite text-gray-700"}>
                            {"-"}&nbsp;&nbsp;{book.subtitle}
                        </div>
                    )}
                    <span className={"text-gray-700 font-suite mt-4"}>책 사양</span>
                    <div className={"flex flex-col mt-2"}>
                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-25"}>저자</div>
                            <div className={"font-bold"}>{book.author}</div>
                        </div>
                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-25"}>출판사</div>
                            <div className={"font-bold"}>{book.publisher}</div>
                        </div>
                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-25"}>출간일</div>
                            <div className={"font-bold"}>{book.pubDate}</div>
                        </div>
                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-25"}>ISBN</div>
                            <div className={"font-bold"}>{book.isbn}</div>
                        </div>
                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-25"}>알라딘 책 ID</div>
                            <div className={"font-bold"}>{book.aladinId}</div>
                        </div>
                    </div>
                    <span className={"text-gray-700 font-suite mt-4"}>책 설명</span>
                    <div className={"flex flex-col mt-2 font-[HCRBatang] mr-4 wrap-normal"}>
                        {
                            new DOMParser().parseFromString(book.description, "text/html")
                                .documentElement.textContent
                        }
                    </div>
                </div>
            </div>
        </>
    );
}
