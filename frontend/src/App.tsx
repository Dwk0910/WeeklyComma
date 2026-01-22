import { Routes, Route } from "react-router-dom";

import PreTopBar from "./component/PreTopBar";
import TopBar from "./component/TopBar";
import Footer from "./component/Footer.tsx";

import Main from "./pages/Main.tsx";

export default function App() {
    return (
        <>
            <div className={"w-full flex relative flex-col items-center"}>
                <div className={"w-full absolute bg-gray-200 h-10 z-0"} />
                <div className={"w-300 z-10"}>
                    <PreTopBar />
                    <TopBar />
                    <Routes>
                        <Route index element={<Main />} />
                    </Routes>
                </div>
                <div className={"w-full border-t border-gray-400 mt-15"} />
                <div className={"w-300 z-10"}>
                    <Footer />
                </div>
            </div>
        </>
    );
}
