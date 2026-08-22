import { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, BACKEND_ADDRESS } from "../../index.tsx";

import WaitingScreen from "./WaitingScreen";

export default function AuthCallback() {
    const { oauth_type } = useParams();
    const [searchParams] = useSearchParams();

    const redirect_uri = encodeURI(window.location.origin + `/authcallback/${oauth_type}`);
    const auth_code = searchParams.get("code")!.toString();
    const state = searchParams.get("state")!.toString();

    if (auth_code == null || !oauth_type || oauth_type == "") window.location.assign("/");

    const params = useRef<{
        oauth_type: string;
        redirect_uri: string;
        auth_code: string;
        state: string;
    }>({
        oauth_type: oauth_type!.toString(),
        redirect_uri,
        auth_code,
        state
    });

    useEffect(() => {
        api.post(BACKEND_ADDRESS + `authsessions`, {
            authType: params.current.oauth_type,
            auth_code: params.current.auth_code,
            state: params.current.state,
            redirect_uri: params.current.redirect_uri
        })
            .then((res) => {
                if (res.status == 200) {
                    localStorage.setItem("wca_lsdata", JSON.stringify(res.data));
                    window.location.assign("/");
                } else {
                    alert(`Received http status code ${res.status}`);
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
    }, []);
    return <WaitingScreen />;
}
