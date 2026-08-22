import { type ReactNode } from "react";

export default function Component({ children }: { children: ReactNode }) {
    return <div className={"flex flex-col ml-4"}>{children}</div>;
}

export function Title({ children }: { children: ReactNode }) {
    return <div className={"mt-4 mb-2 font-suite font-bold text-[1.2rem]"}>{children}</div>;
}

export function SubTitle({ children, description }: { children: ReactNode; description?: string }) {
    return !description ? (
        <div className={"font-seoulnamsan"}>&nbsp;-&nbsp;&nbsp;{children}</div>
    ) : (
        <>
            <div className={"font-seoulnamsan"}>&nbsp;-&nbsp;&nbsp;{children}</div>
            <div className={"ml-6 mb-2 -my-1.5 font-suite font-light text-gray-500 text-[0.8rem]"}>
                {description}
            </div>
        </>
    );
}
