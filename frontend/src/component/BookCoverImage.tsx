import { useState } from "react";
import { LuBookOpen, LuMusic, LuFilm } from "react-icons/lu";
import type { MediaType } from "../types/book.ts";
import ServerImg from "./ServerImg.tsx";

export default function BookCoverImage({
    book,
    className = "",
    loading = "lazy"
}: {
    book: {
        title: string;
        coverImg?: string | null;
        customCoverImg?: string | null;
        mediaType?: MediaType | null;
    };
    className?: string;
    loading?: "lazy" | "eager";
}) {
    const source = book.customCoverImg || book.coverImg || "";
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const alt = `${book.title} 표지`;
    const Icon =
        book.mediaType === "MUSIC"
            ? LuMusic
            : book.mediaType === "TV" || book.mediaType === "MOVIE"
              ? LuFilm
              : LuBookOpen;
    if (!source || failedSource === source) {
        return (
            <div
                className={`${className} flex flex-col items-center justify-center gap-3 bg-[#f3f1eb] px-3 text-center text-stone-500`}
                role="img"
                aria-label={`${book.title} · 표지 이미지 없음`}
            >
                <Icon className="shrink-0 opacity-50" size={24} aria-hidden="true" />
                <span className="line-clamp-3 text-xs font-suite leading-relaxed">
                    {book.title}
                </span>
            </div>
        );
    }
    return book.customCoverImg ? (
        <ServerImg
            fileId={book.customCoverImg}
            alt={alt}
            className={className}
            loading={loading}
            onLoadError={() => setFailedSource(source)}
        />
    ) : (
        <img
            src={source}
            alt={alt}
            className={className}
            loading={loading}
            onError={() => setFailedSource(source)}
        />
    );
}
