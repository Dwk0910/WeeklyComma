import { type ReactNode } from "react";

export default function Title({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
    return (
        <>
            <div className={"flex items-end mt-8 w-full border-b border-gray-300 pb-5"}>
                <div className={"font-seoulnamsan ml-5 text-3xl"}>{children}</div>
                {subtitle && (
                    <div className={"font-suite text-gray-500 mb-0.5 ml-3"}>{subtitle}</div>
                )}
            </div>
        </>
    );
}
