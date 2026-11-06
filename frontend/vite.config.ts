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
            if (!env.BACKEND_ORIGIN?.trim()) {
                throw new Error(
                    "Set BACKEND_ORIGIN in Vercel Environment Variables for this deployment environment"
                );
            }
            let origin: URL;
            try {
                origin = new URL(env.BACKEND_ORIGIN);
            } catch {
                throw new Error(
                    "BACKEND_ORIGIN must be a complete HTTPS origin including https://"
                );
            }
            if (
                origin.protocol !== "https:" ||
                origin.username ||
                origin.password ||
                origin.pathname !== "/" ||
                origin.search ||
                origin.hash
            ) {
                throw new Error(
                    "BACKEND_ORIGIN must be an HTTPS origin without credentials, path, query or fragment"
                );
            }
            if (!env.BACKEND_PROXY_SECRET || env.BACKEND_PROXY_SECRET.length < 32) {
                throw new Error(
                    "Set BACKEND_PROXY_SECRET to at least 32 characters, matching the backend SECURITY_PROXY_SECRET"
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
