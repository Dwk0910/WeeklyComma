import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { isAxiosError } from "axios";
import { api } from "../index.tsx";

export const FILE_EXTENSIONS = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "mp4",
    "mov",
    "mkv",
    "webm",
    "mp3",
    "wav",
    "m4a",
    "ogg",
    "pdf"
];
export const FILE_ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");
export type InquiryAttachment = { id: string; name: string; extension: string; size: number };
type SelectedFile = { key: string; file: File; uploadedId?: string };
export function fileSize(size: number) {
    return size < 1024 * 1024
        ? `${Math.max(1, Math.ceil(size / 1024)).toLocaleString("ko-KR")} KB`
        : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function useInquiryUploads(onUnauthorized: () => void) {
    const [files, setFiles] = useState<SelectedFile[]>([]);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState("");
    const uploaded = useRef(new Set<string>());
    const controller = useRef<AbortController | null>(null);
    const mounted = useRef(true);
    const removing = useRef(new Set<string>());
    useEffect(() => {
        mounted.current = true;
        const ids = uploaded.current;
        return () => {
            mounted.current = false;
            controller.current?.abort();
            // The server refuses deletion if a response was lost after the inquiry was saved.
            for (const id of ids) void api.delete("files", { params: { id } }).catch(() => {});
        };
    }, []);

    function select(event: ChangeEvent<HTMLInputElement>) {
        const added = Array.from(event.target.files || []);
        event.target.value = "";
        if (!added.length) return;
        if (files.length + added.length > 5) {
            setError("파일은 최대 5개까지 첨부할 수 있습니다.");
            return;
        }
        for (const file of added) {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            if (!FILE_EXTENSIONS.includes(ext)) {
                setError(`${file.name}: 허용되지 않는 파일 확장자입니다.`);
                return;
            }
            if (!file.size || file.size > 50 * 1024 * 1024) {
                setError("빈 파일은 첨부할 수 없으며, 파일당 50MB까지 허용됩니다.");
                return;
            }
            if (file.name.length > 240) {
                setError("파일 이름은 240자 이내로 줄여 주세요.");
                return;
            }
        }
        if (
            [...files.map((f) => f.file), ...added].reduce((n, f) => n + f.size, 0) >
            100 * 1024 * 1024
        ) {
            setError("첨부파일은 전체 100MB 이하여야 합니다.");
            return;
        }
        setError("");
        setFiles((previous) => [
            ...previous,
            ...added.map((file) => ({ key: crypto.randomUUID(), file }))
        ]);
    }
    async function remove(entry: SelectedFile) {
        if (removing.current.has(entry.key)) return;
        removing.current.add(entry.key);
        try {
            if (entry.uploadedId) {
                await api.delete("files", { params: { id: entry.uploadedId } });
                uploaded.current.delete(entry.uploadedId);
            }
            setFiles((previous) => previous.filter((f) => f.key !== entry.key));
            setError("");
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 401) onUnauthorized();
            else if (isAxiosError(e) && e.response?.status === 404) {
                if (entry.uploadedId) uploaded.current.delete(entry.uploadedId);
                setFiles((previous) => previous.filter((f) => f.key !== entry.key));
            } else
                setError(
                    "파일을 제거하지 못했습니다. 이미 접수된 문의의 파일은 제거할 수 없습니다."
                );
        } finally {
            removing.current.delete(entry.key);
        }
    }
    async function upload() {
        controller.current = new AbortController();
        const ids: string[] = [];
        for (const [index, entry] of files.entries()) {
            if (entry.uploadedId) {
                ids.push(entry.uploadedId);
                continue;
            }
            const body = new FormData();
            body.append("file", entry.file);
            body.append("purpose", "inquiry");
            setProgress(`첨부파일 업로드 중 (${index + 1}/${files.length})`);
            const response = await api.post("files", body, {
                signal: controller.current.signal,
                timeout: 120000,
                onUploadProgress: (e) => {
                    if (e.total)
                        setProgress(
                            `첨부파일 업로드 중 (${index + 1}/${files.length}) · ${Math.round((e.loaded / e.total) * 100)}%`
                        );
                }
            });
            const id = String(response.headers.location || "")
                .split("/")
                .pop();
            if (!id || !/^[0-9a-f-]{36}$/i.test(id))
                throw new Error("파일 업로드 응답을 확인하지 못했습니다.");
            uploaded.current.add(id);
            if (!mounted.current) {
                void api.delete("files", { params: { id } }).catch(() => {});
                throw new Error("작성이 취소되었습니다.");
            }
            ids.push(id);
            setFiles((previous) =>
                previous.map((f) => (f.key === entry.key ? { ...f, uploadedId: id } : f))
            );
        }
        setProgress("의견을 접수하고 있습니다.");
        return ids;
    }
    return {
        files,
        error,
        progress,
        select,
        remove,
        upload,
        commit: () => uploaded.current.clear()
    };
}
