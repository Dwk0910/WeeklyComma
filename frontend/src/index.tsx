import axios from "axios";

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";

import App from "./App.tsx";
import "./index.css";

const getCookie: (name: string) => string | null = (name) => {
    const cookies = document.cookie.split(";").reduce((acc: { [key: string]: string }, cookie) => {
        const [key, value] = cookie.split("=").map((c) => c.trim());
        if (key) acc[key] = decodeURIComponent(value);
        return acc;
    }, {});

    return cookies[name] || null;
};

const deleteCookie: (name: string) => void = (name) =>
    (document.cookie = `${name}=; max-age=0; path=/`);

axios.defaults.withCredentials = true;

const WCA_CSRF = getCookie("WCA_CSRF");
const WCA_USER_INF = getCookie("WCA_USER_INF");
if (WCA_CSRF && WCA_USER_INF) {
    axios.interceptors.request.use((config) => {
        config.headers.set("X-Csrf-Token", WCA_CSRF);
        return config;
    });
} else {
    deleteCookie("WCA_CSRF");
    deleteCookie("WCA_USER_INF");
}

createRoot(document.getElementById("root")!).render(
    <CookiesProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </CookiesProvider>
);
