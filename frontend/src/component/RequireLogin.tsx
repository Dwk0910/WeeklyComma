import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "../index.tsx";
import { BoardFeedback } from "../pages/boards/BoardShared.tsx";

export function LoginRedirect() {
    const location = useLocation();
    useEffect(() => {
        localStorage.removeItem("wca_lsdata");
        window.dispatchEvent(new Event("weeklycomma:session-change"));
    }, []);
    return (
        <Navigate
            to={`/login?${new URLSearchParams({ returnTo: location.pathname + location.search })}`}
            replace
        />
    );
}

// Verify the session before mounting any private page, independently of its API.
export default function RequireLogin() {
    const location = useLocation();
    const path = location.pathname + location.search;
    const [result, setResult] = useState<{
        path: string;
        status: "ready" | "unauthorized" | "error";
    }>({ path: "", status: "error" });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        api.get("authsessions/me", { signal: controller.signal })
            .then(({ data }) => {
                if (controller.signal.aborted) return;
                localStorage.setItem("wca_lsdata", JSON.stringify(data));
                window.dispatchEvent(new Event("weeklycomma:session-change"));
                setResult({ path, status: "ready" });
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                setResult({
                    path,
                    status:
                        isAxiosError(error) && error.response?.status === 401
                            ? "unauthorized"
                            : "error"
                });
            });
        return () => controller.abort();
    }, [path, attempt]);

    const status = result.path === path ? result.status : "loading";
    if (status === "unauthorized") return <LoginRedirect />;
    if (status === "ready") return <Outlet />;
    return (
        <main className="mx-5 mt-14 mb-24 min-h-140 border-t border-neutral-800 font-suite">
            <BoardFeedback
                title={
                    status === "loading"
                        ? "로그인 상태를 확인하고 있습니다."
                        : "로그인 상태를 확인하지 못했습니다."
                }
                error={status === "error"}
                onRetry={
                    status === "error"
                        ? () => {
                              setResult({ path: "", status: "error" });
                              setAttempt((n) => n + 1);
                          }
                        : undefined
                }
            />
        </main>
    );
}
