import { useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../index.tsx";
import { consumeNaverLogin } from "../../lib/loginFlow.ts";
import { saveSession } from "../../lib/session.ts";
import WaitingScreen from "./WaitingScreen";

export default function AuthCallback() {
    const { oauth_type } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const operation = useRef<Promise<{ data: unknown; returnTo: string }> | null>(null);
    useEffect(() => {
        let active = true;
        // Reuse the single-use OAuth code exchange if an effect is mounted again.
        if (!operation.current) {
            operation.current = (async () => {
                let returnTo = "/";
                try {
                    if (oauth_type !== "OAUTH_NAVER") throw new Error("Invalid provider");
                    returnTo = consumeNaverLogin(params.get("state"));
                } catch {
                    throw { reason: "expired", returnTo };
                }
                if (params.has("error")) throw { reason: "cancelled", returnTo };
                const code = params.get("code");
                if (!code) throw { reason: "expired", returnTo };
                try {
                    const { data } = await api.post("authsessions", {
                        authType: "OAUTH_NAVER",
                        auth_code: code,
                        state: params.get("state"),
                        redirect_uri: window.location.origin + "/authcallback/OAUTH_NAVER"
                    });
                    return { data, returnTo };
                } catch (error) {
                    throw {
                        reason:
                            isAxiosError(error) && error.response?.status === 401
                                ? "account"
                                : "unavailable",
                        returnTo
                    };
                }
            })();
        }
        operation.current
            .then(({ data, returnTo }) => {
                if (!active) return;
                saveSession(data);
                navigate(returnTo, { replace: true });
            })
            .catch((failure: unknown) => {
                if (!active) return;
                const error = failure as { reason?: string; returnTo?: string } | null;
                navigate(
                    `/login?${new URLSearchParams({ error: error?.reason || "unavailable", returnTo: error?.returnTo || "/" })}`,
                    { replace: true }
                );
            });
        return () => {
            active = false;
        };
    }, [navigate, oauth_type, params]);
    return <WaitingScreen />;
}
