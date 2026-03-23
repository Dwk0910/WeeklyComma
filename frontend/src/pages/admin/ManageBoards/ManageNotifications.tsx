import Component, { Title } from "../lib_component/Component";
import BACKEND_ADDRESS from "../../../App";

import axios from "axios";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

import loading_gif from "../../../assets/loading.gif";

export default function ManageNotifications() {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedPosts, setSelectedPosts] = useState<Array<string>>([]);

    useEffect(() => {
        axios.get(BACKEND_ADDRESS + "post/getAllPost").then((res) => {
            console.log(res.data);
            setIsLoading(false);
        });
    }, []);

    return (
        <Component>
            <Title>공지 관리</Title>
            <div className={"flex"}>
                <button
                    className={
                        "p-2 mb-2 bg-blue-500 text-white font-suite w-25 rounded-xs cursor-pointer"
                    }
                >
                    새 글 작성
                </button>
                <button
                    className={clsx(
                        "p-2 ml-2 mb-2 text-white font-suite w-25 rounded-xs cursor-pointer",
                        "transition-colors duration-200 ease-in-out",
                        selectedPosts.length != 0 ? "bg-blue-500" : "bg-neutral-400"
                    )}
                >
                    선택 고정
                </button>
                <button
                    className={clsx(
                        "p-2 ml-2 mb-2 text-white font-suite w-25 rounded-xs cursor-pointer",
                        "transition-colors duration-200 ease-in-out",
                        selectedPosts.length != 0 ? "bg-red-400" : "bg-neutral-400"
                    )}
                >
                    선택 삭제
                </button>
                <span
                    className={clsx(
                        "ml-2 p-2 font-suite text-gray-500 transition-opacity duration-200 ease-in-out",
                        selectedPosts.length == 0 ? "opacity-0" : "opacity-100"
                    )}
                >
                    선택한 글 수 : {selectedPosts.length}
                </span>
            </div>
            <div className={"flex border-b pb-8 px-3 border-b-gray-500 w-full h-5 mt-2 font-suite"}>
                <style>
                    {`
                        .notice-table-header {
                            text-align: center;
                        }
                    `}
                </style>
                <div className={"notice-table-header w-8"}>선택</div>
                <div className={"notice-table-header w-40"}>작성자</div>
                <div className={"notice-table-header w-90"}>이름</div>
                <div className={"notice-table-header w-20"}>작성번호</div>
                <div className={"notice-table-header w-35"}>작성일</div>
                <div className={"notice-table-header w-35"}>수정일</div>
            </div>
            {isLoading ? (
                <div className={"w-full h-100 flex flex-col justify-center items-center"}>
                    <span className={"font-suite"}>글 목록을 불러오는 중입니다...</span>
                    <img alt={"loading"} src={loading_gif} className={"w-10 mt-5"} />
                </div>
            ) : (
                <div className={"w-full flex flex-col"}></div>
            )}
        </Component>
    );
}
