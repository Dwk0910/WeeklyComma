import { useParams, useSearchParams } from "react-router-dom";
import { BACKEND_ADDRESS } from "../../App.tsx";
import axios from "axios";

import WaitingScreen from "./WaitingScreen.tsx";

export default function AuthCallback() {
    const { oauth_type } = useParams();

    const [searchParams] = useSearchParams();

    const redirect_uri = encodeURI(window.location.origin + `/authcallback/${oauth_type}`);
    const auth_code = searchParams.get("code");
    const state = searchParams.get("state");

    if (auth_code == null || oauth_type == null || oauth_type === "") window.location.assign("/");

    axios
        .post(
            BACKEND_ADDRESS + `authsessions`,
            {
                authType: oauth_type,
                auth_code,
                state,
                redirect_uri
            },
            { withCredentials: true }
        )
        .then((res) => {
            if (res.status == 201) window.location.assign("/");
            else {
                alert("Received http status code " + res.status);
                window.location.assign("/");
            }
        })
        .catch((err) => {
            console.log(err);
            alert(
                "유저 정보를 불러오는 데 실패하였습니다. 해당 계정으로 회원가입이 이루어졌는지 확인해 주세요."
            );
            window.location.assign("/");
        });

    return WaitingScreen();
}
