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
        /^\/(login|signup|logout|authcallback|signupcallback)(\/|$)/i.test(pathname)
    )
        return "/";
    return url.pathname + url.search + url.hash;
}

export const oauthProviders = {
    OAUTH_NAVER: { label: "네이버", endpoint: "https://nid.naver.com/oauth2.0/authorize" },
    OAUTH_GOOGLE: { label: "Google", endpoint: "https://accounts.google.com/o/oauth2/v2/auth" }
} as const;
export type OAuthProvider = keyof typeof oauthProviders;
export type OAuthPurpose = "login" | "signup";
export function isOAuthProvider(value: string | undefined): value is OAuthProvider {
    return value === "OAUTH_NAVER" || value === "OAUTH_GOOGLE";
}
export function oauthRedirectUri(
    provider: OAuthProvider,
    purpose: OAuthPurpose,
    origin = window.location.origin
) {
    return `${origin}/${purpose === "login" ? "authcallback" : "signupcallback"}/${provider}`;
}
const oauthKey = (provider: OAuthProvider, purpose: OAuthPurpose) =>
    `weeklycomma:oauth:${provider}:${purpose}`;
export type PendingOAuth = {
    provider: OAuthProvider;
    purpose: OAuthPurpose;
    state: string;
    createdAt: number;
    returnTo: string;
    codeVerifier?: string;
    nonce?: string;
    userName?: string;
};
function base64url(bytes: Uint8Array) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}
export async function startOAuth(
    provider: OAuthProvider,
    clientId: string | undefined,
    returnTo: string,
    purpose: OAuthPurpose = "login",
    userName?: string
) {
    if (!clientId?.trim() || clientId === "undefined") throw new Error("OAuth is not configured");
    if (purpose === "signup" && (!userName?.trim() || userName.length > 80))
        throw new Error("Invalid user name");
    const state = crypto.randomUUID();
    const pending: PendingOAuth = {
        provider,
        purpose,
        state,
        createdAt: Date.now(),
        returnTo: safeReturnTo(returnTo),
        userName
    };
    const query = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        state,
        redirect_uri: oauthRedirectUri(provider, purpose)
    });
    if (provider === "OAUTH_GOOGLE") {
        pending.codeVerifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
        pending.nonce = crypto.randomUUID();
        const challenge = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(pending.codeVerifier)
        );
        query.set("scope", "openid email profile");
        query.set("nonce", pending.nonce);
        query.set("code_challenge", base64url(new Uint8Array(challenge)));
        query.set("code_challenge_method", "S256");
        query.set("prompt", "select_account");
    }
    sessionStorage.setItem(oauthKey(provider, purpose), JSON.stringify(pending));
    window.location.assign(oauthProviders[provider].endpoint + "?" + query);
}
export function consumeOAuth(
    provider: OAuthProvider,
    purpose: OAuthPurpose,
    state: string | null
): PendingOAuth {
    const key = oauthKey(provider, purpose);
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    const pending = raw ? JSON.parse(raw) : null;
    if (
        !pending ||
        !state ||
        pending.state !== state ||
        pending.provider !== provider ||
        pending.purpose !== purpose ||
        !Number.isFinite(pending.createdAt) ||
        pending.createdAt > Date.now() ||
        Date.now() - pending.createdAt > MAX_AGE ||
        (provider === "OAUTH_GOOGLE" &&
            (typeof pending.codeVerifier !== "string" ||
                !/^[A-Za-z0-9._~-]{43,128}$/.test(pending.codeVerifier) ||
                typeof pending.nonce !== "string" ||
                !/^[A-Za-z0-9_-]{16,128}$/.test(pending.nonce))) ||
        (purpose === "signup" &&
            (typeof pending.userName !== "string" ||
                !pending.userName.trim() ||
                pending.userName.length > 80))
    )
        throw new Error("Invalid OAuth state");
    return {
        ...pending,
        returnTo: safeReturnTo(typeof pending.returnTo === "string" ? pending.returnTo : null)
    };
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
