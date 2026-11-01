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
function SignupFrame({
    title,
    description,
    returnTo,
    back,
    children
}: {
    title: string;
    description: string;
    returnTo: string;
    back?: boolean;
    children: ReactNode;
}) {
    const reduced = useReducedMotion();
    if (getLSdata()) return <Navigate to={returnTo} replace />;
    return (
        <main className="login-page signup-page mx-5 mt-14 mb-24 min-h-140 font-suite">
            <PageTitle title="회원가입" />
            <div className="login-stage">
                <section className="login-card" aria-labelledby="signup-heading">
                    <motion.div
                        className="login-ribbon"
                        aria-hidden="true"
                        initial={reduced ? false : { y: -18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                    <h1 id="signup-heading" className="font-batang">
                        {title}
                    </h1>
                    <p className="login-intro">{description}</p>
                    {children}
                    {back && (
                        <Link className="signup-back" to={signupUrl("/signup", returnTo)}>
                            <LuArrowLeft aria-hidden="true" /> 다른 방법으로 가입하기
                        </Link>
                    )}
                    <div className="signup-login-link">
                        이미 계정이 있나요? <Link to={signupUrl("/login", returnTo)}>로그인</Link>
                    </div>
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

export function SignupEmail() {
    const [params] = useSearchParams();
    const returnTo = safeReturnTo(params.get("returnTo"));
    const [values, setValues] = useState<SignupFields>({
        userName: "",
        email: "",
        password: "",
        passwordConfirm: ""
    });
    const [errors, setErrors] = useState<SignupErrors>({});
    const [checked, setChecked] = useState(false);
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
        setChecked(false);
        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
            ...(field === "userName" || field === "email" ? { password: undefined } : {}),
            ...(field === "password" ? { passwordConfirm: undefined } : {})
        }));
    }
    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const next = validateSignup(values);
        setErrors(next);
        setChecked(false);
        const first = (Object.keys(next) as (keyof SignupFields)[])[0];
        if (first) {
            (form.current?.elements.namedItem(first) as HTMLInputElement | null)?.focus();
            return;
        }
        // UI validation only: never submit or persist credentials before email verification is available.
        setChecked(true);
    }
    return (
        <SignupFrame
            title="이메일로 시작하기."
            description="책 이야기에서 사용할 정보를 알려주세요."
            returnTo={returnTo}
            back
        >
            <p className="signup-preview-note">
                이메일 회원가입은 준비 중이에요. 입력 내용을 먼저 확인할 수 있어요.
            </p>
            <motion.form
                ref={form}
                noValidate
                onSubmit={submit}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
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
                        value={values.email}
                        aria-required="true"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? "signup-email-error" : undefined}
                        onChange={(event) => update("email", event.target.value)}
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
                    <PasswordChecklist
                        id="signup-password-guide"
                        visible={showPasswordGuide}
                        checks={passwordChecks(values.password, values)}
                        success="사용하실 수 있는 비밀번호입니다"
                    />
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
                            onChange={(event) => update("passwordConfirm", event.target.value)}
                        />
                        <button
                            type="button"
                            className="login-eye"
                            aria-label={
                                confirmVisible ? "확인 비밀번호 숨기기" : "확인 비밀번호 보기"
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
                        checks={passwordConfirmationChecks(values.password, values.passwordConfirm)}
                        success="비밀번호가 일치합니다"
                    />
                    <ErrorMessage id="signup-confirm-error" message={errors.passwordConfirm} />
                </div>
                <button type="submit" className="login-submit">
                    입력 내용 확인 <LuArrowRight aria-hidden="true" />
                </button>
                {checked && (
                    <motion.p
                        className="signup-checked"
                        role="status"
                        initial={reduced ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <LuCheck aria-hidden="true" /> 입력 내용을 모두 확인했어요. 이메일 가입은
                        아직 준비 중이에요.
                    </motion.p>
                )}
            </motion.form>
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
