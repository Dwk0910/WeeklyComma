import axios from "axios";
import { getLSdata } from "./session.ts";

// API Settings
export const BACKEND_ADDRESS =
    (import.meta.env.VITE_BACKEND_PROTOCOL == "ns" ? "http" : "https") +
    `://${import.meta.env.VITE_BACKEND_ADDRESS}/`;

export const api = axios.create({
    baseURL: BACKEND_ADDRESS,
    timeout: 10000,
    withCredentials: true
});

api.interceptors.request.use((config) => {
    if (["post", "put", "patch", "delete"].includes(config.method || "")) {
        config.headers["X-Requested-With"] = "WeeklyComma";
    }
    // The initial session check may populate or refresh this value after startup.
    const lsdata = getLSdata();
    if (lsdata && lsdata["csrfToken"]) config.headers["X-CSRF-Token"] = lsdata["csrfToken"];
    return config;
});
