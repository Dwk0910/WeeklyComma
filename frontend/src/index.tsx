/* eslint-disable react-refresh/only-export-components -- Entry point keeps legacy API/session exports; new consumers use lib/api and lib/session. */
import { api } from "./lib/api.ts";
export { api, BACKEND_ADDRESS } from "./lib/api.ts";
import { getLSdata } from "./lib/session.ts";
export { getLSdata } from "./lib/session.ts";

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

async function checkApiThenRender() {
    let apiErr: unknown = null;
    await api
        .get("authsessions/me")
        .then((res) => {
            localStorage.setItem("wca_lsdata", JSON.stringify(res.data));
        })
        .catch((err) => {
            if (getLSdata()) localStorage.removeItem("wca_lsdata");
            if (err.response && err.response.status == 401) return;
            apiErr = err;
        });

    // rendering
    if (apiErr)
        root.render(
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
                        {apiErr.toString()}
                    </div>
                </div>
            </div>
        );
    else
        root.render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
}

void checkApiThenRender();
