import axios from "axios";
import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import WaitingScreen from "./WaitingScreen.tsx";
import { BACKEND_ADDRESS } from "../../App.tsx";

export default function SignUpCallback() {
    const { oauth_type } = useParams();
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();

    const redirect_uri = encodeURI(window.location.origin + `/signupcallback/${oauth_type}`);
    const auth_code = searchParams.get("code");
    const state = searchParams.get("state");
    const userName = localStorage.getItem("username");

    useEffect(() => {
        if (auth_code == null || oauth_type == null || oauth_type === "")
            navigate("/", { replace: true });

        void axios
            .post(BACKEND_ADDRESS + "users", {
                authType: oauth_type,
                auth_code,
                redirect_uri,
                state,
                userName
            })
            .then(() => {
                navigate("/", { replace: true });
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return WaitingScreen();
}
