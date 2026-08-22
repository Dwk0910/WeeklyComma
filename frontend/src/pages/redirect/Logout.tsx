import { BACKEND_ADDRESS, api } from "../../index.tsx";
import WaitingScreen from "./WaitingScreen";

export default function Logout() {
    api.delete(BACKEND_ADDRESS + "authsessions").then((res) => {
        if (res.status === 200) {
            localStorage.removeItem("wca_lsdata");
            window.location.assign("/");
        }
    });
    return <WaitingScreen />;
}
