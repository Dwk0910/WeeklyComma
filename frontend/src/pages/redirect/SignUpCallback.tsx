import { useEffect, useRef } from "react";
import { isAxiosError } from "axios";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import WaitingScreen from "./WaitingScreen.tsx";
import { api } from "../../index.tsx";
import { consumeOAuth, isOAuthProvider, oauthRedirectUri } from "../../lib/loginFlow.ts";

export default function SignUpCallback() {
    const { oauth_type } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const returnTo = useRef("/");
    const operation = useRef<Promise<string> | null>(null);
    useEffect(() => {
        let active = true;
        if (!operation.current)
            operation.current = (async () => {
                if (!isOAuthProvider(oauth_type)) throw new Error("expired");
                let pending;
                try {
                    pending = consumeOAuth(oauth_type, "signup", params.get("state"));
                    returnTo.current = pending.returnTo;
                } catch {
                    throw new Error("expired");
                }
                if (params.has("error")) throw new Error("cancelled");
                if (
                    !params.get("code") ||
                    (oauth_type === "OAUTH_GOOGLE" &&
                        params.has("iss") &&
                        params.get("iss") !== "https://accounts.google.com")
                )
                    throw new Error("expired");
                try {
                    await api.post("users", {
                        authType: oauth_type,
                        auth_code: params.get("code"),
                        state: params.get("state"),
                        redirect_uri: oauthRedirectUri(oauth_type, "signup"),
                        userName: pending.userName,
                        code_verifier: pending.codeVerifier,
                        nonce: pending.nonce
                    });
                } catch (error) {
                    throw new Error(
                        isAxiosError(error) && error.response?.status === 409
                            ? "signup_conflict"
                            : "signup_unavailable",
                        { cause: error }
                    );
                }
                return pending.returnTo;
            })();
        operation.current
            .then((returnTo) => {
                if (active)
                    navigate(
                        `/login?${new URLSearchParams({ registered: oauth_type || "", returnTo })}`,
                        { replace: true }
                    );
            })
            .catch((error: unknown) => {
                if (active)
                    navigate(
                        `/signup?${new URLSearchParams({ error: error instanceof Error ? error.message : "signup_unavailable", provider: isOAuthProvider(oauth_type) ? oauth_type : "", returnTo: returnTo.current })}`,
                        { replace: true }
                    );
            });
        return () => {
            active = false;
        };
    }, [navigate, oauth_type, params]);
    return <WaitingScreen />;
}
