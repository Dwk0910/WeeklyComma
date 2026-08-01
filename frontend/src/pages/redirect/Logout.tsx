import axios from "axios";
import { useCookies } from "react-cookie";

import { BACKEND_ADDRESS } from "../../App.tsx";
import WaitingScreen from "./WaitingScreen";

export default function Logout() {
    const [, , removeCookie] = useCookies(["WCA_CSRF", "WCA_USER_INF"]);

    axios.delete(BACKEND_ADDRESS + "authsessions").then((res) => {
        if (res.status === 200) {
            removeCookie("WCA_CSRF");
            removeCookie("WCA_USER_INF");
            window.location.assign("/");
        }
    });
    return <WaitingScreen />;
}
