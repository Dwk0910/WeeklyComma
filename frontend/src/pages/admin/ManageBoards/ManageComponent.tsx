import Component, { Title } from "../lib_component/Component";
import Editor from "./Editor.tsx";
import { BACKEND_ADDRESS, api } from "../../../index.tsx";

import { clsx } from "clsx";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { BsPinAngle } from "react-icons/bs";
import { LuX, LuPencil } from "react-icons/lu";
import loading_gif from "../../../assets/loading.gif";

export type PostType = "NOTICE" | "EVENT" | "G_RECOMMENDATION" | "W_RECOMMENDATION";

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

export default function ManageComponent({
    postType,
    title,
    attributions
}: {
    postType: PostType;
    title: string;
    attributions?: object;
}) {
    const [isLoading, setIsLoading] = useState<boolean>();
    const [postEditorVisible, setPostEditorVisible] = useState<boolean>(false);
    const [posts, setPosts] = useState<Array<Post>>([]);
    const [selectedPosts, setSelectedPosts] = useState<Array<Post>>([]);

    // 조회 모달용 게시글 상태
    const [viewingPost, setViewingPost] = useState<Post | null>(null);
    // 수정 시 전달할 게시글 상태
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    const getPosts: () => Promise<void> = useCallback(async () => {
        setIsLoading(true);
        return api
            .get(BACKEND_ADDRESS + `posts`, {
                params: {
                    ...attributions!,
                    postType
                }
            })
            .then((res) => {
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
    }, [postType, attributions]);

    useEffect(() => {
        (async () => {
            await getPosts();
        })();
    }, [getPosts]);

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

    // 수정 창으로 전환하는 핸들러
    const handleStartEdit = (post: Post) => {
        setEditingPost(post);
        setViewingPost(null); // 조회 모달 닫기
        setPostEditorVisible(true); // 에디터 열기
    };

    return (
        <Component>
            <Title>{title}</Title>
            <div className={"mr-4"}>
                <Editor
                    postType={postType}
                    visible={postEditorVisible}
                    refreshAction={getPosts}
                    attributions={attributions}
                    editingPost={editingPost}
                    closeAction={() => {
                        setPostEditorVisible(false);
                        setEditingPost(null); // 수정 상태 초기화
                    }}
                />
            </div>
            <div className={"mb-10"}>
                <div className={"flex"}>
                    <button
                        className={menuBtnStyle(false, "bg-green-600")}
                        style={{ marginLeft: 0 }}
                        onClick={() => {
                            setEditingPost(null); // 새 글 작성이므로 수정 상태 비움
                            setPostEditorVisible((prev) => !prev);
                        }}
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
                            selectedPosts
                                .filter((i) => !i.isPinned)
                                .map((i) => {
                                    api.patch(BACKEND_ADDRESS + `posts/${i.id}`, null, {
                                        params: { pin: true }
                                    }).then(async () => {
                                        await getPosts();
                                    });
                                });
                        }}
                    >
                        선택 고정
                    </button>
                    <button
                        className={menuBtnStyle(true, "bg-blue-500", "bg-neutral-400")}
                        style={{ width: "120px" }}
                        onClick={async () => {
                            selectedPosts
                                .filter((i) => i.isPinned)
                                .map((i) => {
                                    api.patch(BACKEND_ADDRESS + `posts/${i.id}`, null, {
                                        params: { pin: false }
                                    }).then(async () => {
                                        await getPosts();
                                    });
                                });
                        }}
                    >
                        선택 고정 해제
                    </button>
                    <button
                        className={menuBtnStyle(true, "bg-red-400", "bg-neutral-400")}
                        onClick={async () => {
                            if (confirm("정말 선택한 글들을 삭제하시겠습니까?")) {
                                selectedPosts.forEach((i) => {
                                    api.delete(BACKEND_ADDRESS + `posts/${i.id}`).then(
                                        async () => await getPosts()
                                    );
                                });
                            }
                        }}
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
                        {posts.length > 0 ? (
                            posts.map((item) => (
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
                                            checked={selectedPosts
                                                .map((i) => i.id)
                                                .includes(item.id)}
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
                                        className={
                                            "w-110 cursor-pointer flex items-center hover:underline"
                                        }
                                        onClick={() => setViewingPost(item)} // 글 조회 모달 오픈
                                    >
                                        {item.title}
                                        {item.isPinned && (
                                            <BsPinAngle className={"text-gray-500 ml-1"} />
                                        )}
                                    </div>
                                    {(() => {
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
                            ))
                        ) : (
                            <div
                                className={
                                    "w-full h-25 flex justify-center items-center font-suite"
                                }
                            >
                                글이 없습니다.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 글 조회 모달 팝업 */}
            <AnimatePresence>
                {viewingPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
                        onClick={() => setViewingPost(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    {viewingPost.title}
                                    {viewingPost.isPinned && (
                                        <BsPinAngle className="text-red-500 text-sm" />
                                    )}
                                </h2>
                                <button
                                    onClick={() => setViewingPost(null)}
                                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                                >
                                    <LuX size={20} />
                                </button>
                            </div>

                            {/* Meta Info */}
                            <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 flex gap-4 font-suite">
                                <span>작성자: {viewingPost.author}</span>
                                <span>
                                    작성일:{" "}
                                    {new Date(viewingPost.createdAt * 1000).toLocaleDateString()}
                                </span>
                                <span>
                                    수정일:{" "}
                                    {new Date(viewingPost.updatedAt * 1000).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Content Body */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: viewingPost.content }}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => handleStartEdit(viewingPost)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors cursor-pointer font-suite"
                                >
                                    <LuPencil size={16} />
                                    수정
                                </button>
                                <button
                                    onClick={() => setViewingPost(null)}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300 transition-colors cursor-pointer font-suite"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Component>
    );
}
