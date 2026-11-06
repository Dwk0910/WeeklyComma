import { type BoardConfig } from "./boardConfig.ts";
import { BsPinAngle } from "react-icons/bs";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

export function PostDate({ timestamp }: { timestamp: number }) {
    const date = new Date(timestamp * 1000);
    return (
        <time dateTime={date.toISOString()}>
            {dateFormatter
                .formatToParts(date)
                .filter((part) => ["year", "month", "day"].includes(part.type))
                .map((part) => part.value)
                .join(".")}
        </time>
    );
}

export function PinnedPostBadge() {
    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-red-100/70 px-2 py-1 text-xs font-normal text-neutral-700">
            <BsPinAngle className="text-red-500" aria-hidden="true" />
            고정
        </span>
    );
}

export function BoardHeading({ board, count }: { board: BoardConfig; count?: number }) {
    return (
        <header className="mb-8 flex items-end justify-between gap-6">
            <div>
                <h1 className="font-seoulnamsan text-3xl text-neutral-900">{board.title}</h1>
                <p className="mt-3 text-sm text-neutral-500">{board.description}</p>
            </div>
            {count !== undefined && (
                <p className="pb-0.5 text-sm text-neutral-500">
                    전체 <span className="text-neutral-800">{count.toLocaleString("ko-KR")}</span>건
                </p>
            )}
        </header>
    );
}

export function BoardFeedback({
    title,
    error = false,
    onRetry
}: {
    title: string;
    error?: boolean;
    onRetry?: () => void;
}) {
    return (
        <div
            className="py-24 text-center text-sm text-neutral-500"
            role={error ? "alert" : "status"}
        >
            <p>{title}</p>
            {onRetry && (
                <button
                    className="mt-5 cursor-pointer rounded-xs border border-neutral-300 px-5 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4"
                    onClick={onRetry}
                >
                    다시 불러오기
                </button>
            )}
        </div>
    );
}
