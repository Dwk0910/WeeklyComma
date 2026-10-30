import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuArrowLeft, LuHouse } from "react-icons/lu";
import PageTitle from "../component/PageTitle.tsx";

export default function NotFound() {
    const navigate = useNavigate();
    const heading = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        heading.current?.focus({ preventScroll: true });
    }, []);

    const goBack = () => {
        const index = window.history.state?.idx;
        if (typeof index === "number" && index > 0) navigate(-1);
        else navigate("/", { replace: true });
    };

    return (
        <main className="mx-5 mt-14 mb-24 flex min-h-140 flex-col items-center justify-center border-t border-neutral-200 px-8 py-20 text-center font-suite">
            <PageTitle title="페이지를 찾을 수 없습니다" />
            <p className="text-7xl font-light tracking-wider text-neutral-300">404</p>
            <h1 ref={heading} tabIndex={-1} className="mt-7 text-3xl text-neutral-900 outline-none">
                페이지를 찾을 수 없습니다.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-neutral-500">
                주소가 잘못되었거나, 페이지가 이동 또는 삭제되었을 수 있습니다.
                <br />
                입력하신 주소를 확인해 주세요.
            </p>
            <div className="mt-9 flex items-center gap-3 text-sm">
                <button
                    onClick={goBack}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xs border border-neutral-300 px-6 py-3 text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                    <LuArrowLeft aria-hidden="true" />
                    이전 페이지로
                </button>
                <Link
                    to="/"
                    replace
                    className="inline-flex items-center gap-2 rounded-xs border border-neutral-800 bg-neutral-800 px-6 py-3 text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-800"
                >
                    <LuHouse aria-hidden="true" />
                    홈으로
                </Link>
            </div>
        </main>
    );
}
