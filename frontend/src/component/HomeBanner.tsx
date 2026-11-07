import { useState } from "react";
import ServerImg from "./ServerImg.tsx";

export function BannerSkeleton() {
    return (
        <div
            role="status"
            aria-label="배너를 불러오는 중"
            className="h-full w-full animate-pulse bg-neutral-100 motion-reduce:animate-none"
        >
            <div className="h-full w-full bg-gradient-to-br from-neutral-100 via-neutral-200/60 to-neutral-100" />
        </div>
    );
}

export default function HomeBanner({ fileId, alt }: { fileId: string; alt: string }) {
    return <BannerImage key={fileId} fileId={fileId} alt={alt} />;
}

function BannerImage({ fileId, alt }: { fileId: string; alt: string }) {
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    return (
        <div className="relative h-full w-full" aria-busy={status === "loading"}>
            {status === "loading" && (
                <div className="absolute inset-0">
                    <BannerSkeleton />
                </div>
            )}
            {status === "error" && (
                <div className="flex h-full items-center justify-center bg-neutral-50 text-sm text-neutral-400">
                    배너를 불러오지 못했습니다.
                </div>
            )}
            <ServerImg
                fileId={fileId}
                alt={alt}
                onLoad={() => setStatus("ready")}
                onError={() => setStatus("error")}
                onLoadError={() => setStatus("error")}
                className={`h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${status === "ready" ? "opacity-100" : "opacity-0 absolute inset-0"}`}
            />
        </div>
    );
}
