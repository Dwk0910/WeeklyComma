import axios from "axios";
import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";

// useGoogleLogin 훅은 App 안에서 정의할 수 없음 (훅들은 App이 불려오면서 실행되는데, useGoogleLogin은 <GoogleOAuthProvider/> 안에 속해야 하기 때문에 외부에서 선언한 다음 App에서 호출해야함
export default function LoginButtion({ backend }: { backend: string }) {
    const redirect_uri = window.location.origin;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
            (async () => {
                // code 노출 억제
                window.history.replaceState({}, document.title, window.location.pathname);
                await axios
                    .post(backend + "/auth/getToken", { auth_code: code, redirect_uri })
                    .then((res) => {
                        if (res.status == 200) localStorage.setItem("wca_token", res.data);
                        window.location.reload();
                    })
                    .catch((err) => {
                        console.warn(err);
                    });
            })();
        }
    });

    const login = useGoogleLogin({
        flow: "auth-code",
        ux_mode: "redirect",
        scope: "openid email profile",
        redirect_uri
    });

    return (
        <div
            className={"text-[.8rem] text-neutral-700 mt-2 ml-4 cursor-pointer hover:underline"}
            onClick={() => login()}
        >
            큐레이터 로그인
        </div>
    );
}
