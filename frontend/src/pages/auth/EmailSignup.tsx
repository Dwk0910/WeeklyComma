import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { isAxiosError } from "axios";
import { Link, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { LuArrowRight } from "react-icons/lu";
import { api } from "../../lib/api.ts";
import { getLSdata } from "../../lib/session.ts";
import { isOAuthProvider, oauthProviders, safeReturnTo, startOAuth } from "../../lib/loginFlow.ts";
import { SignupFrame, SignupRegistration } from "./Signup.tsx";
import ErrorMessage from "./AuthFeedback.tsx";

type Verified = { status: "new" | "existing"; email: string; loginMethod: string | null };

function failureMessage(error: unknown) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 429) {
        const seconds = Number(isAxiosError(error) ? error.response?.headers["retry-after"] : 0);
        return Number.isFinite(seconds) && seconds > 0
            ? `요청이 많습니다. 약 ${Math.ceil(seconds / 60)}분 후 다시 시도해 주세요.`
            : "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    }
    return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function SignupEmail() {
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const [email, setEmail] = useState("");
    const [sent, setSent] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();
    const [feedback, setFeedback] = useState<string>();
    const busy = useRef(false);
    const input = useRef<HTMLInputElement>(null);
    const reduced = useReducedMotion();
    async function request(event?: SubmitEvent<HTMLFormElement>) {
        event?.preventDefault();
        if (busy.current) return;
        const address = email.trim();
        if (!address || address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
            setError("이메일 형식을 확인해 주세요.");
            input.current?.focus();
            return;
        }
        busy.current = true;
        setPending(true);
        setError(undefined);
        setFeedback(undefined);
        try {
            await api.post("users/email/request", { email: address }, { timeout: 35000 });
            setEmail(address);
            if (sent) setFeedback("인증 메일을 다시 보냈어요.");
            setSent(true);
        } catch (error) {
            setError(failureMessage(error));
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <SignupFrame
            title={sent ? "메일함에 편지를 보냈어요." : "이메일로 시작하기."}
            description={
                sent
                    ? "메일 속 버튼을 누르면 회원가입을 이어갈 수 있어요."
                    : "확인 메일을 받을 이메일을 알려주세요."
            }
            returnTo={returnTo}
            back={!sent}
        >
            {sent ? (
                <motion.div
                    className="signup-mail-sent"
                    role="status"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <p className="signup-address">{email}</p>
                    <p className="signup-mail-help">
                        메일이 보이지 않나요?
                        <br />
                        스팸함을 확인하거나 잠시 후 다시 받아보세요.
                    </p>
                    <button
                        type="button"
                        className="login-submit"
                        disabled={pending}
                        onClick={() => void request()}
                    >
                        {pending ? "보내는 중" : "인증 메일 다시 보내기"}
                        <LuArrowRight aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="signup-back"
                        disabled={pending}
                        onClick={() => {
                            setSent(false);
                            setError(undefined);
                            setFeedback(undefined);
                        }}
                    >
                        이메일 주소 변경
                    </button>
                    <p className="signup-mail-feedback">{feedback}</p>
                    <ErrorMessage id="signup-mail-send-error" message={error} />
                </motion.div>
            ) : (
                <form noValidate onSubmit={request} aria-busy={pending}>
                    <div className="login-field">
                        <label htmlFor="signup-request-email">이메일</label>
                        <input
                            ref={input}
                            id="signup-request-email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="이메일을 입력해 주세요"
                            value={email}
                            readOnly={pending}
                            aria-required="true"
                            aria-invalid={!!error}
                            aria-describedby={error ? "signup-email-error" : undefined}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setError(undefined);
                            }}
                        />
                        <ErrorMessage id="signup-email-error" message={error} />
                    </div>
                    <button type="submit" className="login-submit" disabled={pending}>
                        {pending ? "보내는 중" : "인증 메일 받기"}
                        <LuArrowRight aria-hidden="true" />
                    </button>
                </form>
            )}
        </SignupFrame>
    );
}

function ExistingAccount({ email, loginMethod }: { email: string; loginMethod: string | null }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();
    const provider = isOAuthProvider(loginMethod ?? "")
        ? (loginMethod as "OAUTH_NAVER" | "OAUTH_GOOGLE")
        : null;
    const label = provider
        ? oauthProviders[provider].label
        : loginMethod === "LOCAL"
          ? "이메일과 비밀번호"
          : "기존 로그인 방법";
    async function login() {
        if (!provider || pending) return;
        setPending(true);
        try {
            await startOAuth(
                provider,
                provider === "OAUTH_NAVER"
                    ? import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID
                    : import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID,
                "/"
            );
        } catch {
            setError("로그인에 연결하지 못했어요. 다시 시도해 주세요.");
            setPending(false);
        }
    }
    return (
        <div className="signup-existing">
            <SignupFrame
                title="이미 등록된 계정입니다."
                description="이 이메일로 등록된 계정이 있습니다. 아래의 기존 로그인 방법으로 로그인해 주세요."
                returnTo="/"
            >
                {provider && (
                    <p className="signup-linking-note">
                        이 이메일과 비밀번호로도 로그인하고 싶으신가요?
                        <br />
                        로그인 후 <strong>설정 → 계정 → 로그인 방법</strong>에서 이메일 로그인을
                        추가할 수 있도록 준비 중입니다.
                    </p>
                )}
                <div className="signup-account-info">
                    <span className="signup-address">{email}</span>
                    <span>{label}로 가입한 계정</span>
                </div>
                {provider ? (
                    <button
                        type="button"
                        className="login-submit"
                        disabled={pending}
                        onClick={() => void login()}
                    >
                        {pending ? "연결하는 중" : `${label}로 로그인하기`}
                        <LuArrowRight aria-hidden="true" />
                    </button>
                ) : (
                    <Link className="login-submit" to="/login">
                        로그인하기
                        <LuArrowRight aria-hidden="true" />
                    </Link>
                )}
                <ErrorMessage id="signup-existing-error" message={error} />
                <Link className="signup-back" to="/signup/email">
                    다른 이메일로 가입하기
                </Link>
            </SignupFrame>
        </div>
    );
}

export function SignupEmailVerify() {
    const [verified, setVerified] = useState<Verified & { token: string }>();
    const [error, setError] = useState<string>();
    const token = useRef<string>("");
    const operation = useRef<Promise<Verified> | null>(null);
    useEffect(() => {
        let active = true;
        if (!operation.current) {
            const fragment = new URLSearchParams(window.location.hash.slice(1));
            token.current = fragment.get("token") || "";
            // Keep the bearer token only in component memory, not URLs, localStorage or analytics.
            window.history.replaceState(
                window.history.state,
                "",
                window.location.pathname + window.location.search
            );
            if (getLSdata()) return;
            operation.current = /^[A-Za-z0-9_-]{43}$/.test(token.current)
                ? api
                      .post<Verified>("users/email/inspect", { token: token.current })
                      .then((response) => response.data)
                : Promise.reject(new Error("invalid-link"));
        }
        operation.current
            .then((result) => {
                if (active) setVerified({ ...result, token: token.current });
            })
            .catch((error) => {
                if (active)
                    setError(
                        isAxiosError(error) && error.response?.status !== 400
                            ? failureMessage(error)
                            : "확인 링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 요청해 주세요."
                    );
            });
        return () => {
            active = false;
        };
    }, []);
    if (verified?.status === "existing") return <ExistingAccount {...verified} />;
    if (verified?.status === "new")
        return (
            <SignupRegistration
                token={verified.token}
                email={verified.email}
                onExisting={(result) => setVerified({ ...result, status: "existing", token: "" })}
            />
        );
    return (
        <SignupFrame
            title={error ? "링크를 확인해 주세요." : "이메일을 확인하고 있어요."}
            description={error || "잠시만 기다려 주세요."}
            returnTo="/"
        >
            {error && (
                <Link className="login-submit" to="/signup/email">
                    인증 메일 다시 받기
                    <LuArrowRight aria-hidden="true" />
                </Link>
            )}
        </SignupFrame>
    );
}
