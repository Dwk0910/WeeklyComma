import { useState } from "react";
import { SiNaver } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { clsx } from "clsx";
import { Link, useLocation } from "react-router-dom";
import { safeReturnTo, startOAuth, oauthProviders } from "../lib/loginFlow.ts";

import type { OAuthProvider } from "../lib/loginFlow.ts";

export default function PreTopBar({ login, name }: { login: boolean; name: string }) {
    return (
        <div
            className={clsx(
                "flex justify-between items-center",
                "w-full h-10 px-6 flex bg-gray-200"
            )}
        >
            <div className={"flex"}>
                <span className={"text-[.75rem] text-neutral-500 mt-2"}>
                    {login ? (
                        <>
                            <strong>{`${name}님`}</strong> 환영합니다!
                        </>
                    ) : (
                        "주간쉼표에 오신 여러분을 환영합니다!"
                    )}
                </span>
                <LoginInteraction login={login} />
            </div>
            <div className={"flex items-center"}>
                <span
                    className={"text-[.8rem] text-neutral-500 mt-2 cursor-pointer"}
                    onClick={() => window.open("https://github.com/Dwk0910/WeeklyComma")}
                >
                    GitHub
                </span>
                <div className={"border-l border-l-gray-400 w-1 h-3 mt-2 ml-2 mr-1"}></div>
                <span className={"text-[.8rem] text-neutral-500 mt-2"}>Credits</span>
            </div>
        </div>
    );
}

const LoginInteraction = ({ login }: { login: boolean }) => {
    const location = useLocation();
    return login ? (
        <div
            className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
            onClick={() => window.location.assign("/logout")}
        >
            로그아웃하기
        </div>
    ) : (
        <>
            <Link
                className="text-[.8rem] text-neutral-700 mt-2 ml-4 hover:underline"
                to={`/login?${new URLSearchParams({ returnTo: safeReturnTo(location.pathname + location.search) })}`}
            >
                로그인
            </Link>
            <SocialSignup returnTo={safeReturnTo(location.pathname + location.search)} />
        </>
    );
};

function SocialSignup({ returnTo }: { returnTo: string }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    async function signup(provider: OAuthProvider) {
        if (pending) return;
        const userName = window.prompt("사용할 이름을 입력해 주세요.")?.trim();
        if (!userName) return;
        if (userName.length > 80) {
            setError("이름은 80자 이내로 입력해 주세요.");
            return;
        }
        setPending(true);
        setError("");
        try {
            await startOAuth(
                provider,
                provider === "OAUTH_NAVER"
                    ? import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID
                    : import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID,
                returnTo,
                "signup",
                userName
            );
        } catch {
            setError("회원가입에 연결하지 못했습니다. 다시 시도해 주세요.");
            setPending(false);
        }
    }
    return (
        <details className="relative mt-2 ml-4 text-[.8rem] text-neutral-700">
            <summary className="cursor-pointer list-none hover:underline">회원가입</summary>
            <div
                className="absolute top-full left-0 z-50 mt-2 w-60 rounded border border-neutral-200 bg-white p-2 shadow-sm"
                aria-label="회원가입 방법"
            >
                {(Object.keys(oauthProviders) as OAuthProvider[]).map((provider) => (
                    <button
                        type="button"
                        key={provider}
                        disabled={pending}
                        className="flex w-full items-center gap-2 rounded px-3 py-3 text-left hover:bg-neutral-50 disabled:opacity-50"
                        onClick={() => void signup(provider)}
                    >
                        {provider === "OAUTH_NAVER" ? (
                            <SiNaver className="text-[#03c75a]" aria-hidden="true" />
                        ) : (
                            <FcGoogle aria-hidden="true" />
                        )}
                        {oauthProviders[provider].label}로 회원가입
                    </button>
                ))}
                {error && (
                    <p role="alert" className="px-3 py-2 text-red-700">
                        {error}
                    </p>
                )}
            </div>
        </details>
    );
}
