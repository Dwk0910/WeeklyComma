import axios from "axios";

import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import PreTopBar from "./component/PreTopBar";
import TopBar from "./component/TopBar";
import Footer from "./component/Footer.tsx";

// Router pages
import Main from "./pages/Main.tsx";
import Management from "./pages/admin/Management.tsx";
import About from "./pages/About.tsx";

import AuthCallback from "./pages/redirect/AuthCallback.ts";
import SignUpCallback from "./pages/redirect/SignUpCallback.ts";

export const BACKEND_ADDRESS =
    (import.meta.env.VITE_API_BACKEND_PROTOCOL == "ns" ? "http://" : "https://") +
    import.meta.env.VITE_API_BACKEND_ADDRESS +
    "/";

export default function App() {
    const [login, setLogin] = useState<boolean>(false);
    const [backendErr, setBackendErr] = useState<{
        error: boolean;
        info: string | null;
    }>({
        error: false,
        info: null
    });

    // Backend server check
    useEffect(() => {
        // Server health check & verify cookie
        (async () => {
            await axios
                .get(BACKEND_ADDRESS + "health")
                .then((res) => {
                    if (res.data == "OK") setLogin(false);
                    else if (res.data == "OK_LOGIN") setLogin(true);
                    else {
                        setBackendErr((_) => ({
                            error: true,
                            info:
                                res.status == 200
                                    ? `Backend server responded unexpected value: ${res.data}`
                                    : res.toString()
                        }));
                    }
                })
                .catch((err) => {
                    setBackendErr({
                        error: true,
                        info: err.toString()
                    });
                });
        })();
    }, []);

    return !backendErr.error ? (
        <>
            <div className={"w-full relative flex flex-col"}>
                <div className={"w-full absolute bg-gray-200 h-10 z-0"} />
                <div className={"w-300 mx-auto z-10"}>
                    <div className={"w-300"}>
                        <PreTopBar login={login} />
                        <TopBar login={login} />
                        <Routes>
                            <Route index element={<Main />} />
                            <Route path={"/authcallback/:oauth_type?"} element={<AuthCallback />} />
                            <Route
                                path={"/signupcallback/:oauth_type?"}
                                element={<SignUpCallback />}
                            />
                            <Route path={"/management"} element={<Management />} />
                            <Route path={"/about"} element={<About />} />
                        </Routes>
                    </div>
                    <div className={"w-full border-t border-gray-400"} />
                    <div className={"w-300 z-10"}>
                        <Footer />
                    </div>
                </div>
            </div>
        </>
    ) : (
        <>
            <div className={"w-screen h-screen flex justify-center items-center"}>
                <div
                    className={
                        "w-150 h-100 border border-gray-400 rounded-xs flex flex-col font-suite"
                    }
                >
                    <div className={"text-red-500 text-[2rem] mt-7 ml-7 -mb-2"}>ERROR!</div>
                    <span className={"ml-7"}>SERVER ERROR OCCURED</span>
                    <div className={"mt-3 ml-7"}>
                        서버와의 통신 오류가 발생했습니다.
                        <br />
                        서비스 점검 중이거나, 일시적인 현상일 수 있습니다.
                        <br />
                        <div className={"mt-2"}>오류가 지속되면 관리자에게 문의 바랍니다.</div>
                    </div>
                    <div className={"mx-7 mt-5 mb-1 border-b border-b-gray-400"} />
                    <div className={"font-mono ml-7 overflow-y-scroll mb-7"}>
                        ERROR INFO
                        <br />
                        {backendErr.info}
                    </div>
                </div>
            </div>
        </>
    );
}
