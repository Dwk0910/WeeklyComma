import { useSearchParams } from "react-router-dom";
import { BACKEND_ADDRESS } from "../../App.tsx";
import axios from "axios";

export default function AuthCallBack() {
    const [searchParams] = useSearchParams();

    const redirect_uri = encodeURI(window.location.origin + "/authcallback");
    const auth_code = searchParams.get("code");
    const state = searchParams.get("state");

    if (auth_code == null) window.location.assign("/");
    else {
        axios
            .post(BACKEND_ADDRESS + "auth/addSession", { auth_code, state, redirect_uri })
            .then((res) => {
                if (res.status == 200) localStorage.setItem("wca_token", res.data);
                window.location.assign("/");
            });
    }

    return (
        <div className={"w-full h-full flex justify-center items-center my-15"}>
            <div
                className={
                    "flex flex-col font-suite items-center border border-gray-400 px-20 py-10"
                }
            >
                <span className={"font-bold text-3xl"}>인증 중입니다</span>
                <span>잠시만 기다려 주세요</span>
            </div>
        </div>
    );
}
