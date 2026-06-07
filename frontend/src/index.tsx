import axios from "axios";

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

axios.defaults.withCredentials = true;
axios.interceptors.request.use((config) => {
    config.headers["X-Csrf-Token"] = import.meta.env.VITE_API_CSRF_TOKEN;
    return config;
});

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
