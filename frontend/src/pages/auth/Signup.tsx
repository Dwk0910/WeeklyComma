import { isAxiosError } from "axios";
import { api } from "../../lib/api.ts";
import { useRef, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SiNaver } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { LuArrowLeft, LuArrowRight, LuCheck, LuEye, LuEyeOff, LuMail } from "react-icons/lu";
import PageTitle from "../../component/PageTitle.tsx";
import ErrorMessage from "./AuthFeedback.tsx";
import PasswordChecklist from "./PasswordChecklist.tsx";
import PasswordStrength from "./PasswordStrength.tsx";
import { passwordChecks, passwordConfirmationChecks } from "../../lib/signupPassword.ts";
import { getLSdata } from "../../lib/session.ts";
import { isOAuthProvider, oauthProviders, safeReturnTo, startOAuth } from "../../lib/loginFlow.ts";
import { validateSignup, validateSignupName } from "../../lib/signupFlow.ts";
import type { SignupErrors, SignupFields } from "../../lib/signupFlow.ts";
import "./Login.css";
import "./Signup.css";

function signupUrl(path: string, returnTo: string) {
    return `${path}?${new URLSearchParams({ returnTo })}`;
}
export function SignupFrame({
    title,
    description,
    returnTo,
    back,
    completed,
    children
}: {
    title: string;
    description: string;
    returnTo: string;
    back?: boolean;
    completed?: boolean;
    children: ReactNode;
}) {
    if (getLSdata()) return <Navigate to={returnTo} replace />;
    return (
        <main className="login-page signup-page mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title="회원가입" />
            <div className="login-stage">
                <section className="login-card" aria-labelledby="signup-heading">
                    <h1 id="signup-heading" className="font-batang">
                        {title}
                    </h1>
                    <p className="login-intro">{description}</p>
                    {children}
                    {completed ? (
                        <Link className="login-submit mt-6" to={signupUrl("/login", returnTo)}>
                            로그인 <LuArrowRight aria-hidden="true" />
                        </Link>
                    ) : (
                        <>
                            {back && (
                                <Link className="signup-back" to={signupUrl("/signup", returnTo)}>
                                    <LuArrowLeft aria-hidden="true" /> 다른 방법으로 가입하기
                                </Link>
                            )}
                            <div className="signup-login-link">
                                이미 계정이 있나요?{" "}
                                <Link to={signupUrl("/login", returnTo)}>로그인</Link>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}

const signupMessages: Record<string, string> = {
    cancelled: "회원가입을 취소했습니다. 편한 방법으로 다시 시작해 주세요.",
    expired: "가입 요청을 확인할 수 없습니다. 다시 시작해 주세요.",
    signup_conflict: "이미 가입된 계정입니다. 기존에 가입한 방법으로 로그인해 주세요.",
    signup_unavailable: "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
};

export default function Signup() {
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const reduced = useReducedMotion();
    const error = params.get("error") || "";
    const message = Object.hasOwn(signupMessages, error) ? signupMessages[error] : undefined;
    return (
        <SignupFrame
            title="책과 만나는 첫 페이지."
            description="나에게 편한 방법으로 시작해 보세요."
            returnTo={returnTo}
        >
            <motion.div
                className="signup-methods"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div
                    className="login-social-buttons"
                    role="group"
                    aria-label="소셜 계정으로 회원가입"
                >
                    <Link
                        className="login-naver"
                        to={signupUrl("/signup/social/OAUTH_NAVER", returnTo)}
                    >
                        <SiNaver aria-hidden="true" /> 네이버로 시작하기
                    </Link>
                    <Link
                        className="login-google"
                        to={signupUrl("/signup/social/OAUTH_GOOGLE", returnTo)}
                    >
                        <FcGoogle aria-hidden="true" /> Google로 시작하기
                    </Link>
                </div>
                <div className="login-divider">또는</div>
                <Link className="login-submit" to={signupUrl("/signup/email", returnTo)}>
                    <LuMail aria-hidden="true" /> 이메일로 회원가입{" "}
                    <LuArrowRight aria-hidden="true" />
                </Link>
                <ErrorMessage id="signup-method-error" message={message} />
            </motion.div>
        </SignupFrame>
    );
}

export function SignupRegistration({
    token,
    email,
    onExisting
}: {
    token: string;
    email: string;
    onExisting: (result: { email: string; loginMethod: string | null }) => void;
}) {
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const [values, setValues] = useState<SignupFields>({
        userName: "",
        email,
        password: "",
        passwordConfirm: ""
    });
    const [errors, setErrors] = useState<SignupErrors>({});
    const [pending, setPending] = useState(false);
    const [feedback, setFeedback] = useState<string>();
    const [result, setResult] = useState<string>();
    const busy = useRef(false);
    const [visible, setVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [activePassword, setActivePassword] = useState<"password" | "passwordConfirm" | null>(
        null
    );
    const showPasswordGuide =
        activePassword === "password" || !!values.password || !!errors.password;
    const showConfirmationGuide =
        activePassword === "passwordConfirm" ||
        !!values.passwordConfirm ||
        !!errors.passwordConfirm;
    const form = useRef<HTMLFormElement>(null);
    const reduced = useReducedMotion();
    function update(field: keyof SignupFields, value: string) {
        setValues((previous) => ({ ...previous, [field]: value }));
        setFeedback(undefined);
        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
            ...(field === "userName" || field === "email" ? { password: undefined } : {}),
            ...(field === "password" ? { passwordConfirm: undefined } : {})
        }));
    }
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        void processSignup();
    }
    async function processSignup() {
        const next = validateSignup(values);
        setErrors(next);
        setFeedback(undefined);
        const first = (Object.keys(next) as (keyof SignupFields)[])[0];
        if (first) {
            (form.current?.elements.namedItem(first) as HTMLInputElement | null)?.focus();
            return;
        }
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        try {
            const { data } = await api.post("users/email/complete", {
                token,
                userName: values.userName.trim(),
                password: values.password
            });
            setValues({ userName: "", email, password: "", passwordConfirm: "" });
            if (data.status === "existing") onExisting(data);
            else setResult("회원가입이 완료되었어요. 이메일과 비밀번호로 로그인해 주세요.");
        } catch (error) {
            const status = isAxiosError(error) ? error.response?.status : undefined;
            setFeedback(
                status === 429
                    ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
                    : status === 400
                      ? "입력 조건을 확인해 주세요. 확인 링크가 만료되었다면 인증 메일을 다시 요청해 주세요."
                      : "이메일 인증을 진행하지 못했어요. 잠시 후 다시 시도해 주세요."
            );
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <SignupFrame
            title={result ? "가입이 완료되었습니다." : "책 이야기를 시작해 주세요."}
            description={
                result
                    ? "주간쉼표에서 나만의 책을 만나보세요."
                    : "이메일을 확인했어요. 나머지 정보를 입력해 주세요."
            }
            returnTo={returnTo}
            back={!result}
            completed={!!result}
        >
            {result ? (
                <div className="signup-checked" role="status">
                    <LuCheck aria-hidden="true" />
                    {result}
                </div>
            ) : (
                <motion.form
                    ref={form}
                    noValidate
                    onSubmit={submit}
                    aria-busy={pending}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <fieldset disabled={pending} className="signup-fields">
                        <div className="login-field">
                            <label htmlFor="signup-name">닉네임</label>
                            <input
                                id="signup-name"
                                name="userName"
                                autoComplete="nickname"
                                placeholder="책 이야기에서 사용할 닉네임"
                                value={values.userName}
                                aria-required="true"
                                aria-invalid={!!errors.userName}
                                aria-describedby={errors.userName ? "signup-name-error" : undefined}
                                onChange={(event) => update("userName", event.target.value)}
                            />
                            <ErrorMessage id="signup-name-error" message={errors.userName} />
                        </div>
                        <div className="login-field">
                            <label htmlFor="signup-email">이메일</label>
                            <input
                                id="signup-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="이메일을 입력해 주세요"
                                value={email}
                                disabled
                                aria-required="true"
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "signup-email-error" : undefined}
                            />
                            <ErrorMessage id="signup-email-error" message={errors.email} />
                        </div>
                        <div
                            className="login-field"
                            onFocusCapture={() => setActivePassword("password")}
                            onBlurCapture={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget))
                                    setActivePassword(null);
                            }}
                        >
                            <label htmlFor="signup-password">비밀번호</label>
                            <div className="login-password-wrap">
                                <input
                                    id="signup-password"
                                    name="password"
                                    type={visible ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="10자 이상 입력해 주세요"
                                    value={values.password}
                                    aria-required="true"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={
                                        [
                                            showPasswordGuide && "signup-password-guide",
                                            errors.password && "signup-password-error"
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || undefined
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
                            <PasswordStrength
                                password={values.password}
                                userName={values.userName}
                                email={values.email}
                            >
                                <PasswordChecklist
                                    id="signup-password-guide"
                                    visible={showPasswordGuide}
                                    checks={passwordChecks(values.password, values)}
                                    success="사용하실 수 있는 비밀번호입니다"
                                />
                            </PasswordStrength>
                            <ErrorMessage id="signup-password-error" message={errors.password} />
                        </div>
                        <div
                            className="login-field"
                            onFocusCapture={() => setActivePassword("passwordConfirm")}
                            onBlurCapture={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget))
                                    setActivePassword(null);
                            }}
                        >
                            <label htmlFor="signup-password-confirm">비밀번호 확인</label>
                            <div className="login-password-wrap">
                                <input
                                    id="signup-password-confirm"
                                    name="passwordConfirm"
                                    type={confirmVisible ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="비밀번호를 한 번 더 입력해 주세요"
                                    value={values.passwordConfirm}
                                    aria-required="true"
                                    aria-invalid={!!errors.passwordConfirm}
                                    aria-describedby={
                                        [
                                            showConfirmationGuide && "signup-confirm-guide",
                                            errors.passwordConfirm && "signup-confirm-error"
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || undefined
                                    }
                                    onChange={(event) =>
                                        update("passwordConfirm", event.target.value)
                                    }
                                />
                                <button
                                    type="button"
                                    className="login-eye"
                                    aria-label={
                                        confirmVisible
                                            ? "확인 비밀번호 숨기기"
                                            : "확인 비밀번호 보기"
                                    }
                                    aria-pressed={confirmVisible}
                                    onClick={() => setConfirmVisible((value) => !value)}
                                >
                                    {confirmVisible ? (
                                        <LuEyeOff aria-hidden="true" />
                                    ) : (
                                        <LuEye aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                            <PasswordChecklist
                                id="signup-confirm-guide"
                                visible={showConfirmationGuide}
                                checks={passwordConfirmationChecks(
                                    values.password,
                                    values.passwordConfirm
                                )}
                                success="비밀번호가 일치합니다"
                            />
                            <ErrorMessage
                                id="signup-confirm-error"
                                message={errors.passwordConfirm}
                            />
                        </div>
                        <button type="submit" className="login-submit" disabled={pending}>
                            {pending ? "가입하는 중" : "회원가입 완료하기"}{" "}
                            <LuArrowRight aria-hidden="true" />
                        </button>
                        <ErrorMessage id="signup-service-error" message={feedback} />
                    </fieldset>
                </motion.form>
            )}
        </SignupFrame>
    );
}

export function SignupSocial() {
    const { provider } = useParams();
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const [name, setName] = useState("");
    const [error, setError] = useState<string>();
    const [feedback, setFeedback] = useState<string>();
    const [pending, setPending] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    if (!isOAuthProvider(provider)) return <Navigate to={signupUrl("/signup", returnTo)} replace />;
    const chosen = provider;
    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (pending) return;
        const error = validateSignupName(name);
        setError(error);
        setFeedback(undefined);
        if (error) {
            input.current?.focus();
            return;
        }
        setPending(true);
        try {
            await startOAuth(
                chosen,
                chosen === "OAUTH_NAVER"
                    ? import.meta.env.VITE_OAUTH_NAVER_CLIENT_ID
                    : import.meta.env.VITE_OAUTH_GOOGLE_CLIENT_ID,
                returnTo,
                "signup",
                name.trim()
            );
        } catch {
            setFeedback("회원가입에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
            setPending(false);
        }
    }
    return (
        <SignupFrame
            title="어떤 닉네임으로 만날까요?"
            description={`${oauthProviders[chosen].label} 계정으로 가입하기 전에, 사용할 닉네임을 정해주세요.`}
            returnTo={returnTo}
            back
        >
            <form noValidate onSubmit={submit} aria-busy={pending}>
                <div className="login-field">
                    <label htmlFor="signup-social-name">닉네임</label>
                    <input
                        ref={input}
                        id="signup-social-name"
                        name="userName"
                        autoComplete="nickname"
                        placeholder="책 이야기에서 사용할 닉네임"
                        value={name}
                        readOnly={pending}
                        aria-required="true"
                        aria-invalid={!!error}
                        aria-describedby={error ? "signup-social-name-error" : undefined}
                        onChange={(event) => {
                            setName(event.target.value);
                            setError(undefined);
                            setFeedback(undefined);
                        }}
                    />
                    <ErrorMessage id="signup-social-name-error" message={error} />
                </div>
                <div>
                    <button
                        type="submit"
                        className={chosen === "OAUTH_NAVER" ? "login-naver" : "login-google"}
                        disabled={pending}
                    >
                        {chosen === "OAUTH_NAVER" ? (
                            <SiNaver aria-hidden="true" />
                        ) : (
                            <FcGoogle aria-hidden="true" />
                        )}
                        {pending ? "연결하는 중" : `${oauthProviders[chosen].label}로 계속하기`}
                    </button>
                    <ErrorMessage id="signup-social-service-error" message={feedback} />
                </div>
            </form>
        </SignupFrame>
    );
}
