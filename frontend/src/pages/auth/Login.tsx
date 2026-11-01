import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { isAxiosError } from "axios";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { LuArrowRight, LuBookmark, LuEye, LuEyeOff } from "react-icons/lu";
import { SiNaver } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { api } from "../../index.tsx";
import { getLSdata, saveSession } from "../../lib/session.ts";
import {
    safeReturnTo,
    startOAuth,
    validateLogin,
    oauthProviders,
    isOAuthProvider
} from "../../lib/loginFlow.ts";
import type { LoginErrors, LoginFields, OAuthProvider } from "../../lib/loginFlow.ts";
import PageTitle from "../../component/PageTitle.tsx";
import ErrorMessage from "./AuthFeedback.tsx";
import "./Login.css";

const oauthErrors: Record<string, string> = {
    cancelled: "소셜 로그인을 취소했습니다. 다시 시도하거나 이메일로 로그인해 주세요.",
    expired: "로그인 요청을 확인할 수 없습니다. 소셜 로그인을 다시 시작해 주세요.",
    account: "연결된 계정을 확인하지 못했습니다. 가입한 계정인지 확인해 주세요.",
    unavailable: "소셜 로그인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    signup_conflict: "이미 가입된 계정입니다. 기존에 가입한 방법으로 로그인해 주세요.",
    signup_unavailable: "회원가입을 완료하지 못했습니다. 상단 회원가입에서 다시 시작해 주세요."
};

type Feedback = { kind: "credentials" | "service"; message: string } | null;

export default function Login() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const [values, setValues] = useState<LoginFields>({ email: "", password: "" });
    const [errors, setErrors] = useState<LoginErrors>({});
    const [feedback, setFeedback] = useState<Feedback>(() => {
        const message = oauthErrors[params.get("error") || ""];
        return message ? { kind: "service", message } : null;
    });
    const [visible, setVisible] = useState(false);
    const [pending, setPending] = useState(false);
    const [retryUntil, setRetryUntil] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const retrySeconds = Math.max(0, Math.ceil((retryUntil - now) / 1000));
    useEffect(() => {
        if (!retryUntil) return;
        const timer = window.setInterval(() => {
            const current = Date.now();
            setNow(current);
            if (current >= retryUntil) window.clearInterval(timer);
        }, 1000);
        return () => window.clearInterval(timer);
    }, [retryUntil]);
    const request = useRef<AbortController | null>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const reduced = useReducedMotion();
    useEffect(() => () => request.current?.abort(), []);

    function update(field: keyof LoginFields, value: string) {
        setValues((previous) => ({ ...previous, [field]: value }));
        if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
        if (feedback && !retrySeconds) setFeedback(null);
    }
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending || request.current || retrySeconds) return;
        const nextErrors = validateLogin(values);
        setErrors(nextErrors);
        setFeedback(null);
        if (nextErrors.email || nextErrors.password) {
            (nextErrors.email ? emailRef : passwordRef).current?.focus();
            return;
        }
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        try {
            const { data } = await api.post(
                "authsessions",
                { authType: "LOCAL", email: values.email.trim(), password: values.password },
                { signal: controller.signal }
            );
            if (controller.signal.aborted) return;
            saveSession(data);
            navigate(returnTo, { replace: true });
        } catch (error) {
            if (controller.signal.aborted) return;
            const status = isAxiosError(error) ? error.response?.status : undefined;
            if (status === 429 && isAxiosError(error)) {
                const header = Number(error.response?.headers["retry-after"]);
                const delay = Number.isFinite(header) && header > 0 ? Math.min(header, 3600) : 60;
                const current = Date.now();
                setNow(current);
                setRetryUntil(current + delay * 1000);
            }
            setFeedback(
                status === 401
                    ? {
                          kind: "credentials",
                          message: "이메일 또는 비밀번호가 일치하지 않습니다. 다시 확인해 주세요."
                      }
                    : {
                          kind: "service",
                          message:
                              status === 429
                                  ? "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요."
                                  : status === 400
                                    ? "입력한 로그인 정보를 다시 확인해 주세요."
                                    : "로그인에 연결하지 못했습니다. 입력한 내용은 그대로 있으니 다시 시도해 주세요."
                      }
            );
        } finally {
            if (!controller.signal.aborted) setPending(false);
            if (request.current === controller) request.current = null;
        }
    }
    async function social(provider: OAuthProvider) {
        if (pending || retrySeconds) return;
        setFeedback(null);
        setPending(true);
        try {
            await startOAuth(
                provider,
                provider === "OAUTH_NAVER"
                    ? import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID
                    : import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID,
                returnTo
            );
        } catch {
            setFeedback({
                kind: "service",
                message: `${oauthProviders[provider].label} 로그인에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.`
            });
            setPending(false);
        }
    }
    if (getLSdata()) return <Navigate to={returnTo} replace />;
    const credentialsInvalid = feedback?.kind === "credentials";
    return (
        <main className="login-page mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title="로그인" />
            <div className="login-stage">
                <section className="login-card" aria-labelledby="login-heading">
                    <motion.div
                        className="login-ribbon"
                        aria-hidden="true"
                        initial={reduced ? false : { y: -18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    <h1 id="login-heading" className="font-batang">
                        머물렀던 페이지로.
                    </h1>
                    <p className="login-intro">좋아하는 책들이 기다리고 있어요.</p>
                    {isOAuthProvider(params.get("registered") || undefined) && (
                        <p className="login-success" role="status">
                            회원가입이 완료되었습니다. 가입한 방법으로 로그인해 주세요.
                        </p>
                    )}
                    <motion.form
                        noValidate
                        onSubmit={submit}
                        aria-busy={pending}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.08 }}
                    >
                        <div className="login-field">
                            <label htmlFor="login-email">이메일</label>
                            <input
                                ref={emailRef}
                                id="login-email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="이메일을 입력해 주세요"
                                value={values.email}
                                readOnly={pending}
                                aria-required="true"
                                aria-invalid={!!errors.email || credentialsInvalid}
                                aria-describedby={
                                    errors.email
                                        ? "login-email-error"
                                        : credentialsInvalid
                                          ? "login-credentials-error"
                                          : undefined
                                }
                                onChange={(event) => update("email", event.target.value)}
                            />
                            <ErrorMessage id="login-email-error" message={errors.email} />
                            <ErrorMessage
                                id="login-credentials-error"
                                message={credentialsInvalid ? feedback.message : undefined}
                            />
                        </div>
                        <div className="login-field">
                            <label htmlFor="login-password">비밀번호</label>
                            <div className="login-password-wrap">
                                <input
                                    ref={passwordRef}
                                    id="login-password"
                                    name="password"
                                    type={visible ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="비밀번호를 입력해 주세요"
                                    value={values.password}
                                    readOnly={pending}
                                    aria-required="true"
                                    aria-invalid={!!errors.password || credentialsInvalid}
                                    aria-describedby={
                                        errors.password
                                            ? "login-password-error"
                                            : credentialsInvalid
                                              ? "login-credentials-error"
                                              : undefined
                                    }
                                    onChange={(event) => update("password", event.target.value)}
                                />
                                <button
                                    type="button"
                                    className="login-eye"
                                    aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
                                    aria-pressed={visible}
                                    onClick={() => setVisible((value) => !value)}
                                >
                                    {visible ? (
                                        <LuEyeOff aria-hidden="true" />
                                    ) : (
                                        <LuEye aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            <ErrorMessage id="login-password-error" message={errors.password} />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="login-submit"
                                disabled={pending || retrySeconds > 0}
                            >
                                <span>
                                    {pending
                                        ? "로그인하는 중"
                                        : retrySeconds > 0
                                          ? `${Math.floor(retrySeconds / 60)}분 ${retrySeconds % 60}초 후 다시 시도`
                                          : "로그인"}
                                </span>
                                <LuArrowRight aria-hidden="true" />
                            </button>
                            <ErrorMessage
                                id="login-service-error"
                                message={
                                    feedback?.kind === "service" ? feedback.message : undefined
                                }
                            />
                        </div>
                        <div className="login-divider">또는</div>
                        <div className="login-social-buttons">
                            <button
                                type="button"
                                className="login-naver"
                                onClick={() => void social("OAUTH_NAVER")}
                                disabled={pending || retrySeconds > 0}
                            >
                                <SiNaver aria-hidden="true" />
                                네이버로 시작하기
                            </button>
                            <button
                                type="button"
                                className="login-google"
                                onClick={() => void social("OAUTH_GOOGLE")}
                                disabled={pending || retrySeconds > 0}
                            >
                                <FcGoogle aria-hidden="true" />
                                Google로 시작하기
                            </button>
                        </div>
                    </motion.form>
                    <div className="login-account-links" aria-label="계정 메뉴">
                        <button type="button" disabled aria-label="비밀번호 찾기 (준비 중)">
                            비밀번호 찾기
                        </button>
                        <span aria-hidden="true" />
                        <Link to={`/signup?${new URLSearchParams({ returnTo })}`}>회원가입</Link>
                    </div>
                </section>
                <p className="login-return">
                    <LuBookmark aria-hidden="true" />
                    {returnTo === "/"
                        ? "책과 당신 사이, 잠깐의 쉼표."
                        : "로그인 후, 읽고 있던 곳으로 돌아갑니다."}
                </p>
            </div>
        </main>
    );
}
