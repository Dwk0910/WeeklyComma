import axios from "axios";

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.tsx";
import "./index.css";

// 백엔드로 날리는 모든 요청에 쿠키를 포함하도록 설정
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
