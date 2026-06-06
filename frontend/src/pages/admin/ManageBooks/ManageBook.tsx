import React, { useState, useRef } from "react";
import { MdCameraAlt } from "react-icons/md";
import FontStyle from "../../../assets/fonts/fonts.tsx";
import { type Book } from "./ManageRecommendation.tsx";

import { SubTitle } from "../lib_component/Component.tsx";

import ManageComponent from "../ManageBoards/ManageComponent.tsx";

export default function ManageBook({ book: initialBook }: { book: Book }) {
    const [book, setBook] = useState<Book>(initialBook);
    const [previewImg, setPreviewImg] = useState<string>(initialBook.coverImg);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name == "isbn") return;

        // 표준 Unix Timestamp인 '초(Seconds)' 단위 정수로 변환하여 저장
        if (name === "pubDate") {
            const timestampInSeconds = value ? Math.floor(new Date(value).getTime() / 1000) : 0;
            setBook((prev) => ({ ...prev, [name]: timestampInSeconds }));
            return;
        }

        setBook((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            setPreviewImg(URL.createObjectURL(file));
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
        const lack = () => {
            return Object.keys(book).some((key) => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                if (requiredFields.includes(key) && (book[key] == null || book[key] == ""))
                    return true;
            });
        };

        if (lack()) {
            alert("책에 대한 필수 정보가 비어 있습니다.");
            return;
        }

        // TODO: 책 정보 서버로 업로드
        console.log(book);
    };

    const inputStyle =
        "bg-transparent border-none border-b border-gray-200 outline-none focus:border-blue-500 transition-all px-1 py-0.5 w-full";

    // 서버에서 온 초(Seconds) 단위 타임스탬프를 UI용 YYYY-MM-DD로 변환
    const formatTimestampToDate = (timestamp: number | string | undefined | null) => {
        if (!timestamp) return "";

        const seconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
        if (isNaN(seconds) || seconds === 0) return "";

        // 자바스크립트 Date 객체는 밀리초를 받으므로 1000을 곱해줌
        const date = new Date(seconds * 1000);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    };

    return (
        <div className="relative">
            <FontStyle />
            <div className={"flex"}>
                <div className="relative shrink-0">
                    <img
                        src={previewImg}
                        alt={"cover"}
                        className={"w-60 h-90 border border-gray-500"}
                    />
                    <div
                        className="absolute w-full h-90 inset-0 flex flex-col justify-center items-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 cursor-pointer"
                        onClick={handleImageClick}
                    >
                        <MdCameraAlt className="text-white text-[2rem]" />
                        <span className={"font-suite text-white"}>사진 바꾸기</span>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>

                <div className={"ml-6 flex flex-col flex-1"}>
                    <SubTitle description={"각각의 정보를 클릭하여 수정할 수 있습니다."}>
                        책 정보 확인
                    </SubTitle>
                    <input
                        name="title"
                        value={book.title}
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

                    <span className={"text-gray-700 font-suite mt-6 font-bold"}>책 사양</span>

                    <div className={"flex font-suite mt-3 text-gray-500"}>
                        <span>ISBN</span>
                        <span className={"ml-3 font-bold"}>{book.isbn}</span>
                    </div>

                    <div className={"flex flex-col mt-2"}>
                        {[
                            { label: "저자", name: "author" },
                            { label: "출판사", name: "publisher" }
                        ].map((field) => (
                            <div key={field.name} className={"flex font-suite items-center"}>
                                <div className={"text-gray-500 w-28 shrink-0"}>{field.label}</div>
                                <input
                                    name={field.name}
                                    value={
                                        new DOMParser().parseFromString(
                                            (book as never)[field.name],
                                            "text/html"
                                        ).documentElement.textContent || ""
                                    }
                                    placeholder={"값을 입력해 주세요"}
                                    onChange={handleChange}
                                    className={`${inputStyle} font-bold`}
                                    readOnly={field.name === "isbn" || field.name === "aladinId"}
                                />
                            </div>
                        ))}

                        <div className={"flex font-suite items-center"}>
                            <div className={"text-gray-500 w-28 shrink-0"}>출간일</div>
                            <input
                                type="date"
                                name="pubDate"
                                value={formatTimestampToDate((book as never)["pubDate"])}
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
                                            checked={
                                                book.difficulty ? book.difficulty == level : false
                                            }
                                            onChange={(e) => handleChange(e)}
                                            className="w-4 h-4 accent-gray-800 cursor-pointer"
                                        />
                                        {level}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <span className={"text-gray-700 font-suite font-bold mt-3"}>책 설명</span>
                    <textarea
                        name="description"
                        value={
                            new DOMParser().parseFromString(book.description, "text/html")
                                .documentElement.textContent || ""
                        }
                        onChange={handleChange}
                        rows={6}
                        className="mt-2 font-[HCRBatang] mr-4 p-2 bg-gray-50/50 border border-gray-200 rounded-sm outline-none focus:border-blue-400 transition-all resize-none overflow-y-auto leading-relaxed"
                    />
                </div>
            </div>
            <div className={"flex w-full justify-end mt-3"}>
                <button
                    className={
                        "cursor-pointer mr-5 bg-gray-500 p-4 text-white rounded-[5px] font-suite transition-[scale] hover:scale-105 ease-in-out"
                    }
                    onClick={() => {
                        serverUpload();
                    }}
                >
                    책 정보 저장
                </button>
            </div>

            <div className="mt-2">
                <ManageComponent
                    articleType={"RECOMMANDATION"}
                    title={"추천글 관리"}
                    params={{ bookId: book.isbn }}
                />
            </div>
        </div>
    );
}
