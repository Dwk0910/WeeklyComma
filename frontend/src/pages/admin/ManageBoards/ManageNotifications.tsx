import Component, { Title } from "../lib_component/Component";
import Editor from "./Editor.tsx";
import { BACKEND_ADDRESS } from "../../../App";

import axios from "axios";
import { clsx } from "clsx";
import { useState, useEffect } from "react";

import { BsPinAngle } from "react-icons/bs";
import loading_gif from "../../../assets/loading.gif";

export type PostType = "NOTICE" | "EVENT";

export type Post = {
    id: number;
    title: string;
    author: string;
    createdAt: number;
    updatedAt: number;
    isPinned: boolean;
    type: PostType;
    content: string;
};

export default function ManageNotifications() {
    const [isLoading, setIsLoading] = useState<boolean>();
    const [postEditorVisible, setPostEditorVisible] = useState<boolean>(false);
    const [posts, setPosts] = useState<Array<Post>>([]);
    const [selectedPosts, setSelectedPosts] = useState<Array<Post>>([]);

    const getPosts: () => Promise<void> = async () => {
        setIsLoading(true);
        return axios.get(BACKEND_ADDRESS + "post/getAllPosts/NOTICE").then((res) => {
            const postList: Post[] = res.data;
            setSelectedPosts([]);
            setPosts(() =>
                postList.sort((a, b) => {
                    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                    return b.createdAt - a.createdAt;
                })
            );
            setIsLoading(false);
        });
    };

    useEffect(() => {
        (async () => {
            await getPosts();
        })();
    }, []);

    const menuBtnStyle: (isVariable: boolean, ...color: string[]) => string = (
        isVariable,
        ...color
    ) => {
        return isVariable
            ? clsx(
                  Array.of(
                      "p-2 ml-2 mb-2 text-white font-suite w-25 rounded-xs",
                      "transition-colors duration-200 ease-in-out",
                      selectedPosts.length != 0
                          ? `${color[0]} cursor-pointer`
                          : `${color[1]} cursor-not-allowed`
                  )
              )
            : clsx(
                  Array.of(
                      `${color[0]} p-2 ml-2 mb-2 text-white font-suite w-25 rounded-xs cursor-pointer`
                  )
              );
    };

    return (
        <Component>
            <Title>공지 관리</Title>
            <Editor articleType={"NOTICE"} visible={postEditorVisible} />
            <div className={"flex"}>
                <button
                    className={menuBtnStyle(false, "bg-green-600")}
                    style={{ marginLeft: 0 }}
                    onClick={() => setPostEditorVisible((prev) => !prev)}
                >
                    {postEditorVisible ? "닫기" : "새 글 작성"}
                </button>
                <button
                    className={menuBtnStyle(false, "bg-blue-500")}
                    onClick={() => setSelectedPosts(posts)}
                >
                    전체 선택
                </button>
                <button
                    className={menuBtnStyle(true, "bg-blue-500", "bg-neutral-400")}
                    onClick={() => setSelectedPosts([])}
                >
                    선택 취소
                </button>
                <button
                    className={menuBtnStyle(true, "bg-blue-500", "bg-neutral-400")}
                    onClick={async () => {
                        await axios
                            .put(
                                BACKEND_ADDRESS + "post/pinPosts",
                                selectedPosts.filter((i) => !i.isPinned).map((i) => i.id),
                                {
                                    headers: { "X-Content-Type-Options": 1 }
                                }
                            )
                            .then(async () => {
                                await getPosts();
                            });
                    }}
                >
                    선택 고정
                </button>
                <button
                    className={menuBtnStyle(true, "bg-blue-500", "bg-neutral-400")}
                    style={{ width: "120px" }}
                    onClick={async () => {
                        await axios
                            .put(
                                BACKEND_ADDRESS + "post/pinPosts",
                                selectedPosts.filter((i) => i.isPinned).map((i) => i.id),
                                { headers: { "X-Content-Type-Options": 0 } }
                            )
                            .then(async () => {
                                await getPosts();
                            });
                    }}
                >
                    선택 고정 해제
                </button>
                <button className={menuBtnStyle(true, "bg-red-400", "bg-neutral-400")}>
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
            <style>{`
            .notice-table > div {
                text-align: center;
            }
            `}</style>
            <div
                className={
                    "flex border-b pb-8 border-b-gray-500 w-full h-5 mt-2 font-suite notice-table"
                }
            >
                <div className={"w-15"}>선택</div>
                <div className={"w-15"}>작성번호</div>
                <div className={"w-35"}>작성자</div>
                <div className={"w-110"}>이름</div>
                <div className={"w-30"}>작성일</div>
                <div className={"w-30"}>수정일</div>
            </div>
            {isLoading ? (
                <div className={"w-full h-100 flex flex-col justify-center items-center"}>
                    <span className={"font-suite"}>글 목록을 불러오는 중입니다...</span>
                    <img alt={"loading"} src={loading_gif} className={"w-10 mt-5"} />
                </div>
            ) : (
                <div className={"w-full flex flex-col"}>
                    {posts.map((item) => (
                        <div
                            className={clsx(
                                "w-full flex border-b py-1",
                                item.isPinned && "bg-red-500/8"
                            )}
                            key={`post-list-button-${item.id}`}
                        >
                            <div className={"w-15 flex justify-center"}>
                                <input
                                    type={"checkbox"}
                                    checked={selectedPosts.map((i) => i.id).includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked)
                                            setSelectedPosts((prev) => [...prev, item]);
                                        else
                                            setSelectedPosts((prev) =>
                                                prev.filter((i) => i.id != item.id)
                                            );
                                    }}
                                />
                            </div>
                            <div className={"w-15 font-suite text-center"}>{item.id}</div>
                            <div className={"w-35 text-center"}>{item.author}</div>
                            <div
                                className={"w-110 cursor-pointer flex items-center hover:underline"}
                            >
                                {item.title}
                                {item.isPinned && <BsPinAngle className={"text-gray-500 ml-1"} />}
                            </div>
                            {(() => {
                                // JS Date 클래스는 밀리초 단위이므로 초 단위인 createdAt에 1000을 곱해줍니다.
                                const createdAtDate: Date = new Date(item.createdAt * 1000);
                                const updatedAtDate: Date = new Date(item.updatedAt * 1000);

                                return (
                                    <>
                                        <div className={"w-30 font-suite text-center"}>
                                            {`${createdAtDate.getFullYear()}.${createdAtDate.getMonth() + 1}.${createdAtDate.getDate()}.`}
                                        </div>
                                        <div className={"w-30 font-suite text-center"}>
                                            {`${updatedAtDate.getFullYear()}.${updatedAtDate.getMonth() + 1}.${updatedAtDate.getDate()}.`}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}
        </Component>
    );
}
