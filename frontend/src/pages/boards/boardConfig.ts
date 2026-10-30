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
