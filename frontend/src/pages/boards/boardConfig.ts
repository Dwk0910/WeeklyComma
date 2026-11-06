import { type PostType } from "../../types/post.ts";

export type BoardConfig = {
    postType: Extract<PostType, "NOTICE" | "EVENT">;
    path: string;
    title: string;
    description: string;
};

export const NOTICE_BOARD: BoardConfig = {
    postType: "NOTICE",
    path: "/notices",
    title: "공지",
    description: "주간쉼표의 새로운 소식과 이용 안내를 전합니다."
};

export const EVENT_BOARD: BoardConfig = {
    postType: "EVENT",
    path: "/events",
    title: "이벤트",
    description: "책과 함께하는 즐거운 만남, 주간쉼표의 이벤트를 전합니다."
};
