import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    if (command === "build" && mode === "production") {
        if (env.VITE_BACKEND_PROTOCOL !== "s" || env.VITE_BACKEND_ADDRESS !== "/api") {
            throw new Error(
                "Production API settings must use VITE_BACKEND_PROTOCOL=s and VITE_BACKEND_ADDRESS=/api"
            );
        }
        if (process.env.VERCEL === "1") {
            const origin = new URL(env.BACKEND_ORIGIN);
            if (
                origin.protocol !== "https:" ||
                origin.username ||
                origin.password ||
                origin.pathname !== "/" ||
                origin.search ||
                origin.hash ||
                !env.BACKEND_PROXY_SECRET ||
                env.BACKEND_PROXY_SECRET.length < 32
            ) {
                throw new Error(
                    "Configure an HTTPS BACKEND_ORIGIN and a BACKEND_PROXY_SECRET of at least 32 characters"
                );
            }
        }
    }
    return {
        plugins: [react(), tailwindcss()],
        server: {
            watch: {
                usePolling: true,
                interval: 100 // 체크 주기
            }
        }
    };
});
