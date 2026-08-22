import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import { getLSdata } from "./index.tsx";

import PreTopBar from "./component/PreTopBar";
import TopBar from "./component/TopBar";
import Footer from "./component/Footer.tsx";

// Router pages
import Main from "./pages/Main.tsx";
import Management from "./pages/admin/Management.tsx";
import About from "./pages/About.tsx";

import AuthCallback from "./pages/redirect/AuthCallback.tsx";
import SignUpCallback from "./pages/redirect/SignUpCallback.tsx";
import Logout from "./pages/redirect/Logout.tsx";

export default function App() {
    const [login, setLogin] = useState<boolean>(false);
    const [admin, setAdmin] = useState<boolean>(false);
    const [name, setName] = useState<string>("");

    // Backend server check
    useEffect(() => {
        // Server health & client login check
        (async () => {
            const lsdata = getLSdata();
            if (lsdata) {
                setLogin(true);
                setName(lsdata["userName"]);
                setAdmin(lsdata["userType"] == "CURATOR");
            }
        })();
    }, []);

    return (
        <>
            <div className={"w-full relative flex flex-col"}>
                <div className={"w-full absolute bg-gray-200 h-10 z-0"} />
                <div className={"w-300 mx-auto z-10"}>
                    <div className={"w-300"}>
                        <PreTopBar login={login} name={name} />
                        <TopBar admin={admin} />
                        <Routes>
                            <Route index element={<Main />} />
                            <Route path={"/authcallback/:oauth_type"} element={<AuthCallback />} />
                            <Route
                                path={"/signupcallback/:oauth_type"}
                                element={<SignUpCallback />}
                            />
                            <Route path={"/logout"} element={<Logout />} />
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
    );
}
