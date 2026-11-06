import axios from "axios";
import { getLSdata } from "./session.ts";

// API Settings
const protocol = import.meta.env.VITE_BACKEND_PROTOCOL;
const address = import.meta.env.VITE_BACKEND_ADDRESS?.trim();
if (!address || !["s", "ns"].includes(protocol)) {
    throw new Error("API environment variables are missing or invalid");
}
export const BACKEND_ADDRESS =
    address === "/api" ? "/api/" : `${protocol === "ns" ? "http" : "https"}://${address}/`;

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
