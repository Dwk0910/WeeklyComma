import { clsx } from "clsx";

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
    return login ? (
        <div
            className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
            onClick={() => window.location.assign("/logout")}
        >
            로그아웃하기
        </div>
    ) : (
        <>
            <div
                className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
                onClick={() => {
                    const client_id = import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID;
                    const state = crypto.randomUUID();
                    window.location.assign(
                        `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${window.location.origin + "/authcallback/OAUTH_NAVER"}&state=${state}`
                    );
                }}
            >
                유저 로그인
            </div>
            <div
                className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
                onClick={() => {
                    const client_id = import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID;
                    const state = crypto.randomUUID();

                    const userName = prompt("Type username") as string;
                    localStorage.setItem("username", userName.replaceAll(" ", ""));

                    window.location.assign(
                        `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${window.location.origin + "/signupcallback/OAUTH_NAVER"}&state=${state}`
                    );
                }}
            >
                회원가입
            </div>
        </>
    );
};
