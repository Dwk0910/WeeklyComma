import axios from "axios";
import { clsx } from "clsx";

export default function PreTopBar({ login }: { login: boolean }) {
    return (
        <div
            className={clsx(
                "flex justify-between items-center",
                "w-full h-10 px-6 flex bg-gray-200"
            )}
        >
            <div className={"flex"}>
                <span className={"text-[.75rem] text-neutral-500 mt-2"}>
                    {login
                        ? "쉼표지기 계정으로 로그인하셨습니다."
                        : "주간쉼표에 오신 여러분들을 환영합니다"}
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
    return login ? (
        <div
            className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
            onClick={() => {
                const token = localStorage.getItem("wca_token");
                axios.get("auth/removeSession", { params: { session_id: token } }).then(() => {
                    localStorage.removeItem("wca_token");
                    window.location.reload();
                });
            }}
        >
            로그아웃하기
        </div>
    ) : (
        <div
            className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
            onClick={() => {
                const client_id = import.meta.env.VITE_API_OAUTH_CLIENT_ID;
                const state = crypto.randomUUID();
                window.location.assign(
                    `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fauthcallback&state=${state}`
                );
            }}
        >
            쉼표지기 로그인
        </div>
    );
};
