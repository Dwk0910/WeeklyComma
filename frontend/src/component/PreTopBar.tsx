import { clsx } from "clsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

import LoginButton from "./LoginButton";

export default function PreTopBar() {
    return (
        <div
            className={clsx(
                "flex justify-between items-center",
                "w-full h-10 px-6 flex bg-gray-200"
            )}
        >
            <div className={"flex"}>
                <span className={"text-[.75rem] text-neutral-500 mt-2"}>
                    주간쉼표에 오신 여러분들을 환영합니다
                </span>
                <GoogleOAuthProvider clientId={import.meta.env.VITE_API_OAUTH_CLIENT_ID}>
                    <LoginButton
                        backend={
                            (import.meta.env.VITE_API_BACKEND_PROTOCOL == "ns"
                                ? "http://"
                                : "https://") + import.meta.env.VITE_API_BACKEND_ADDRESS
                        }
                    />
                </GoogleOAuthProvider>
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
