import { isAxiosError } from "axios";
import type { MediaType } from "../types/book.ts";
import { api } from "./api.ts";
import type { RecommendationBook } from "../pages/admin/recommendations/types.ts";

export type ManagedBook = RecommendationBook & { dbExist: boolean };

function searchFailure(error: unknown) {
    if (isAxiosError(error)) {
        if (error.response?.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
        if (error.response?.status === 403) return "책을 검색할 수 있는 관리 권한을 확인해 주세요.";
        const message = error.response?.data?.message;
        if ([429, 502, 503].includes(error.response?.status ?? 0) && typeof message === "string") {
            return message;
        }
    }
    return "검색 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function searchBookSources(
    query: string,
    signal?: AbortSignal,
    options?: { author: string; page: number; mediaType?: MediaType; provider?: string }
) {
    const [registered, external] = await Promise.allSettled([
        api.get<RecommendationBook[]>("books", { params: { query }, signal }),
        options
            ? api.get<{
                  items: RecommendationBook[];
                  page: number;
                  total: number;
                  hasMore: boolean;
              }>(options.mediaType ? "books/api/catalog" : "books/api/search", {
                  params: { query, ...options },
                  signal
              })
            : api.get<RecommendationBook[]>("books/api", { params: { query }, signal })
    ]);
    const externalData = external.status === "fulfilled" ? external.value.data : [];
    const externalItems = Array.isArray(externalData) ? externalData : externalData.items;
    return {
        page: Array.isArray(externalData) ? 1 : externalData.page,
        total: Array.isArray(externalData) ? externalData.length : externalData.total,
        hasMore: Array.isArray(externalData) ? false : externalData.hasMore,
        registered:
            registered.status === "fulfilled"
                ? registered.value.data
                      .filter(
                          (book) =>
                              !options?.mediaType ||
                              (book.mediaType ?? "BOOK") === options.mediaType
                      )
                      .filter(
                          (book) =>
                              !options?.author.trim() ||
                              book.author?.includes(options.author.trim())
                      )
                      .map((book): ManagedBook => ({ ...book, dbExist: true }))
                : [],
        external:
            external.status === "fulfilled"
                ? externalItems.map((book): ManagedBook => ({ ...book, dbExist: false }))
                : [],
        errors: {
            registered: registered.status === "rejected" ? searchFailure(registered.reason) : null,
            external: external.status === "rejected" ? searchFailure(external.reason) : null
        }
    };
}
