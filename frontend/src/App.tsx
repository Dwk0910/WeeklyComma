import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { getLSdata } from "./index.tsx";

import PreTopBar from "./component/PreTopBar";
import TopBar from "./component/TopBar";
import Footer from "./component/Footer.tsx";
import RequireLogin from "./component/RequireLogin.tsx";

// Router pages
import Main from "./pages/Main.tsx";
import Management from "./pages/admin/Management.tsx";
import ManageMainPage from "./pages/admin/ManageMainPage.tsx";
import ManageNotifications from "./pages/admin/ManageBoards/ManageNotifications.tsx";
import ManageEventBoards from "./pages/admin/ManageBoards/ManageEventBoards.tsx";
import ManageRecommendation from "./pages/admin/ManageBooks/ManageRecommendation.tsx";
import About from "./pages/About.tsx";
import BoardList from "./pages/boards/BoardList.tsx";
import BoardDetail from "./pages/boards/BoardDetail.tsx";
import { NOTICE_BOARD, EVENT_BOARD } from "./pages/boards/boardConfig.ts";
import NotFound from "./pages/NotFound.tsx";
import RecommendationList from "./pages/recommendations/RecommendationList.tsx";
import RecommendationDetail from "./pages/recommendations/RecommendationDetail.tsx";
import Favorites from "./pages/Favorites.tsx";
import Inquiries from "./pages/Inquiries.tsx";

import Login from "./pages/auth/Login.tsx";
import AuthCallback from "./pages/redirect/AuthCallback.tsx";
import SignUpCallback from "./pages/redirect/SignUpCallback.tsx";
import Logout from "./pages/redirect/Logout.tsx";

export default function App() {
    const [login, setLogin] = useState<boolean>(false);
    const [admin, setAdmin] = useState<boolean>(false);
    const [name, setName] = useState<string>("");

    useEffect(() => {
        const syncSession = () => {
            const lsdata = getLSdata();
            setLogin(!!lsdata);
            setName(lsdata ? lsdata["userName"] : "");
            setAdmin(!!lsdata && lsdata["userType"] === "CURATOR");
        };
        syncSession();
        window.addEventListener("weeklycomma:session-change", syncSession);
        return () => window.removeEventListener("weeklycomma:session-change", syncSession);
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
                            <Route path="/login" element={<Login />} />
                            <Route path={"/logout"} element={<Logout />} />
                            <Route path={"/about"} element={<About />} />
                            <Route
                                path="/notices"
                                element={<BoardList key="notices" board={NOTICE_BOARD} />}
                            />
                            <Route
                                path="/notices/:id"
                                element={<BoardDetail board={NOTICE_BOARD} />}
                            />
                            <Route
                                path="/events"
                                element={<BoardList key="events" board={EVENT_BOARD} />}
                            />
                            <Route
                                path="/events/:id"
                                element={<BoardDetail board={EVENT_BOARD} />}
                            />
                            <Route
                                path="/recommendations"
                                element={<RecommendationList key="general" />}
                            />
                            <Route path="/recommendations/:id" element={<RecommendationDetail />} />
                            <Route
                                path="/weekly-recommendations"
                                element={<RecommendationList key="weekly" weekly />}
                            />
                            <Route
                                path="/weekly-recommendations/:id"
                                element={<RecommendationDetail weekly />}
                            />
                            <Route element={<RequireLogin />}>
                                <Route path="/management" element={<Management />}>
                                    <Route index element={<ManageMainPage />} />
                                    <Route path="notices" element={<ManageNotifications />} />
                                    <Route path="events" element={<ManageEventBoards />} />
                                    <Route
                                        path="recommendations"
                                        element={<ManageRecommendation />}
                                    />
                                    <Route
                                        path="inquiries/*"
                                        element={<Inquiries key="admin-inquiries" admin />}
                                    />
                                </Route>
                                <Route path="/favorites" element={<Favorites />} />
                                <Route
                                    path="/to-curator/*"
                                    element={<Inquiries key="my-inquiries" />}
                                />
                            </Route>
                            <Route path={"/404"} element={<NotFound />} />
                            <Route path="*" element={<Navigate to="/404" replace />} />
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
