const OAUTH_KEY = "weeklycomma:naver-login";
const MAX_AGE = 15 * 60 * 1000;

export function safeReturnTo(value: string | null): string {
    if (
        !value ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        value.includes("\\") ||
        Array.from(value).some(
            (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127
        )
    )
        return "/";
    const url = new URL(value, "https://weeklycomma.invalid");
    let pathname: string;
    try {
        pathname = decodeURIComponent(url.pathname);
    } catch {
        return "/";
    }
    if (
        url.origin !== "https://weeklycomma.invalid" ||
        /^\/(login|logout|authcallback|signupcallback)(\/|$)/i.test(pathname)
    )
        return "/";
    return url.pathname + url.search + url.hash;
}

export function startNaverLogin(clientId: string | undefined, returnTo: string) {
    if (!clientId || clientId === "undefined") throw new Error("Naver is not configured");
    const state = crypto.randomUUID();
    sessionStorage.setItem(
        OAUTH_KEY,
        JSON.stringify({ state, returnTo: safeReturnTo(returnTo), createdAt: Date.now() })
    );
    const query = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        state,
        redirect_uri: window.location.origin + "/authcallback/OAUTH_NAVER"
    });
    window.location.assign("https://nid.naver.com/oauth2.0/authorize?" + query);
}

export function consumeNaverLogin(state: string | null): string {
    const raw = sessionStorage.getItem(OAUTH_KEY);
    sessionStorage.removeItem(OAUTH_KEY);
    const pending = raw ? JSON.parse(raw) : null;
    if (
        !pending ||
        !state ||
        pending.state !== state ||
        !Number.isFinite(pending.createdAt) ||
        pending.createdAt > Date.now() ||
        Date.now() - pending.createdAt > MAX_AGE
    )
        throw new Error("Invalid OAuth state");
    return safeReturnTo(typeof pending.returnTo === "string" ? pending.returnTo : null);
}

export type LoginFields = { email: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginFields, string>>;
export function validateLogin(values: LoginFields): LoginErrors {
    const errors: LoginErrors = {};
    const email = values.email.trim();
    if (!email) errors.email = "이메일을 입력해 주세요.";
    else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.email = "이메일 형식을 확인해 주세요.";
    if (!values.password.trim()) errors.password = "비밀번호를 입력해 주세요.";
    else if (Array.from(values.password).length > 128)
        errors.password = "비밀번호가 너무 깁니다. 입력한 내용을 확인해 주세요.";
    return errors;
}
