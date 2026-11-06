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
    attributions?: {
        bookId?: string;
    };
};
