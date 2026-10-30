import { CiStar } from "react-icons/ci";
import { AiFillStar } from "react-icons/ai";

export type BookStarStatus = { starCount: number; starred: boolean };

export default function BookStarButton({
    title,
    status,
    fallbackCount,
    pending,
    error,
    onToggle,
    onRetry,
    className = ""
}: {
    title: string;
    status?: BookStarStatus;
    fallbackCount?: number;
    pending: boolean;
    error?: string;
    onToggle: () => void;
    onRetry: () => void;
    className?: string;
}) {
    return (
        <div className={className}>
            <button
                type="button"
                onClick={onToggle}
                disabled={pending || !status}
                aria-label={`${title} Star ${status?.starred ? "취소" : "등록"}`}
                aria-pressed={status?.starred || false}
                title={status?.starred ? "Star 취소" : "Star 등록"}
                className={`flex items-center justify-start rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-wait ${status?.starred ? "text-amber-500" : "text-gray-700 hover:text-amber-500"}`}
            >
                <span className="text-[1.1rem] -ml-0.5" aria-hidden="true">
                    {status?.starred ? <AiFillStar /> : <CiStar />}
                </span>
                <span className="font-suite ml-1 text-[0.8rem]">
                    {(status?.starCount ?? fallbackCount)?.toLocaleString("ko-KR") ?? "…"}
                </span>
            </button>
            {error && (
                <div role="alert" className="font-suite text-xs text-red-600 mt-1 max-w-60">
                    {error}
                    {!status && (
                        <button type="button" className="ml-1 underline" onClick={onRetry}>
                            다시 시도
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
