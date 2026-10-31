import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { api, getLSdata } from "../../index.tsx";
import { type BookStarStatus } from "../../component/BookStarButton.tsx";

export function useBookStars(isbns: string[]) {
    const [statuses, setStatuses] = useState<Record<string, BookStarStatus>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [pending, setPending] = useState<Record<string, boolean>>({});
    const versions = useRef<Record<string, number>>({});
    const requests = useRef(new Set<string>());
    const key = [...new Set(isbns)].sort().join("|");

    const load = useCallback(async (isbn: string, signal?: AbortSignal) => {
        const version = versions.current[isbn] || 0;
        try {
            const { data } = await api.get<BookStarStatus>(
                `books/${encodeURIComponent(isbn)}/star`,
                { signal }
            );
            if (signal?.aborted || version !== (versions.current[isbn] || 0)) return;
            setStatuses((previous) => ({ ...previous, [isbn]: data }));
            setErrors((previous) => ({ ...previous, [isbn]: "" }));
        } catch {
            if (!signal?.aborted && version === (versions.current[isbn] || 0)) {
                setErrors((previous) => ({
                    ...previous,
                    [isbn]: "책갈피 정보를 불러오지 못했습니다."
                }));
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        key.split("|")
            .filter(Boolean)
            .forEach((isbn) => void load(isbn, controller.signal));
        return () => controller.abort();
    }, [key, load]);

    const toggle = async (isbn: string) => {
        if (!getLSdata()) {
            setErrors((previous) => ({
                ...previous,
                [isbn]: "책갈피를 꽂으려면 상단에서 로그인해 주세요."
            }));
            return;
        }
        const status = statuses[isbn];
        if (!status || requests.current.has(isbn)) return;
        requests.current.add(isbn);
        versions.current[isbn] = (versions.current[isbn] || 0) + 1;
        setPending((previous) => ({ ...previous, [isbn]: true }));
        setErrors((previous) => ({ ...previous, [isbn]: "" }));
        try {
            const path = `books/${encodeURIComponent(isbn)}/star`;
            const { data } = status.starred
                ? await api.delete<BookStarStatus>(path)
                : await api.put<BookStarStatus>(path);
            setStatuses((previous) => ({ ...previous, [isbn]: data }));
        } catch (error) {
            setErrors((previous) => ({
                ...previous,
                [isbn]:
                    isAxiosError(error) && error.response?.status === 401
                        ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
                        : "책갈피를 변경하지 못했습니다. 다시 눌러 주세요."
            }));
        } finally {
            requests.current.delete(isbn);
            setPending((previous) => ({ ...previous, [isbn]: false }));
        }
    };

    return { statuses, errors, pending, load, toggle };
}
