import { useState } from "react";
import { isAxiosError } from "axios";
import { LuDownload, LuPaperclip } from "react-icons/lu";
import ServerImg from "../component/ServerImg.tsx";
import { api } from "../index.tsx";
import { fileSize, type InquiryAttachment } from "./inquiryFiles.ts";

export default function InquiryAttachments({
    files,
    onUnauthorized
}: {
    files: InquiryAttachment[];
    onUnauthorized: () => void;
}) {
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState("");
    async function download(file: InquiryAttachment) {
        setPending(file.id);
        setError("");
        try {
            const response = await api.get(`files/${file.id}`, {
                responseType: "blob",
                timeout: 120000
            });
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            if (isAxiosError(e) && e.response?.status === 401) onUnauthorized();
            else setError("첨부파일을 내려받지 못했습니다. 다시 시도해 주세요.");
        } finally {
            setPending(null);
        }
    }
    if (!files.length) return null;
    return (
        <section className="mb-10 border-y border-neutral-200 py-6" aria-label="첨부파일">
            <h3 className="flex items-center gap-2 text-sm">
                <LuPaperclip aria-hidden="true" />
                첨부파일 {files.length}개
            </h3>
            <ul className="mt-4 space-y-3">
                {files.map((file) => (
                    <li
                        key={file.id}
                        className="flex items-center gap-4 rounded-xs bg-neutral-50 p-4"
                    >
                        {["jpg", "jpeg", "png", "webp", "gif"].includes(file.extension) && (
                            <ServerImg
                                fileId={file.id}
                                alt={`${file.name} 미리보기`}
                                className="h-20 w-28 shrink-0 object-contain"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="wrap-anywhere text-sm">{file.name}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                                {file.extension.toUpperCase()} · {fileSize(file.size)}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={pending !== null}
                            onClick={() => void download(file)}
                            aria-label={`${file.name} 다운로드`}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-2 border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
                        >
                            <LuDownload aria-hidden="true" />
                            {pending === file.id ? "다운로드 중…" : "다운로드"}
                        </button>
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                    {error}
                </p>
            )}
        </section>
    );
}
