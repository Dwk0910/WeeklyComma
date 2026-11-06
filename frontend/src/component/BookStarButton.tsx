import { LuBookmark } from "react-icons/lu";

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
    const action = status?.starred ? "책갈피 빼기" : "책갈피 꽂기";
    const count = status?.starCount ?? fallbackCount;
    const countLabel =
        count === undefined ? "책갈피 수 확인 중" : `책갈피 ${count.toLocaleString("ko-KR")}개`;
    return (
        <div className={className}>
            <button
                type="button"
                onClick={onToggle}
                disabled={pending || !status}
                aria-label={`${title} ${action}, ${countLabel}`}
                aria-pressed={status?.starred || false}
                title={`${action} · ${countLabel}`}
                className={`flex items-center justify-start rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 disabled:cursor-wait ${status?.starred ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}
            >
                <span className="text-[1.1rem] -ml-0.5" aria-hidden="true">
                    <LuBookmark
                        fill={status?.starred ? "currentColor" : "none"}
                        strokeWidth={1.5}
                    />
                </span>
                <span className="font-suite ml-1 text-[0.8rem]">
                    {count?.toLocaleString("ko-KR") ?? "…"}
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
