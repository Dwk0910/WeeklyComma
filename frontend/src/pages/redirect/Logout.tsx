import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { api } from "../../index.tsx";
import WaitingScreen from "./WaitingScreen";
import { BoardFeedback } from "../boards/BoardShared.tsx";

export default function Logout() {
    const navigate = useNavigate();
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const operation = useRef<{ attempt: number; promise: Promise<unknown> } | null>(null);
    useEffect(() => {
        let active = true;
        if (operation.current?.attempt !== attempt) {
            operation.current = {
                attempt,
                promise: api.delete("authsessions").catch((error) => {
                    // An expired or already revoked session is already logged out on the server.
                    if (isAxiosError(error) && error.response?.status === 401) return;
                    throw error;
                })
            };
        }
        operation.current.promise
            .then(() => {
                if (!active) return;
                localStorage.removeItem("wca_lsdata");
                window.dispatchEvent(new Event("weeklycomma:session-change"));
                navigate("/", { replace: true });
            })
            .catch(() => {
                if (active) setFailed(true);
            });
        return () => {
            active = false;
        };
    }, [attempt, navigate]);
    return failed ? (
        <main className="mx-5 mt-14 mb-24 min-h-140 font-suite">
            <BoardFeedback
                title="로그아웃하지 못했습니다. 다시 시도해 주세요."
                error
                onRetry={() => {
                    setFailed(false);
                    setAttempt((n) => n + 1);
                }}
            />
        </main>
    ) : (
        <WaitingScreen />
    );
}
