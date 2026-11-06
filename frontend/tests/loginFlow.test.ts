import assert from "node:assert/strict";
import test from "node:test";
import {
    safeReturnTo,
    validateLogin,
    consumeOAuth,
    startOAuth,
    oauthRedirectUri,
    isOAuthProvider
} from "../src/lib/loginFlow.ts";

test("returnTo keeps local destinations and rejects external targets and login loops", () => {
    assert.equal(safeReturnTo("/favorites?page=2#books"), "/favorites?page=2#books");
    for (const path of [
        null,
        "https://example.com",
        "//example.com",
        "/\\example.com",
        "/\n/example.com",
        "/login",
        "/logout",
        "/signup",
        "/signup/email",
        "/signup/social/OAUTH_GOOGLE",
        "/authcallback/OAUTH_NAVER",
        "/x/../login",
        "/LOGIN",
        "/%6cogin",
        "/%"
    ]) {
        assert.equal(safeReturnTo(path), "/", String(path));
    }
});
test("validates both blank fields, email syntax, and password character limit", () => {
    assert.deepEqual(Object.keys(validateLogin({ email: "", password: "" })), [
        "email",
        "password"
    ]);
    assert.ok(validateLogin({ email: "bad-email", password: "secret" }).email);
    assert.ok(validateLogin({ email: "reader@example.test", password: "가".repeat(129) }).password);
    assert.deepEqual(validateLogin({ email: " reader@example.test ", password: "secret" }), {});
    assert.deepEqual(
        validateLogin({ email: "reader@example.test", password: "가나다라".repeat(16) }),
        {}
    );
});
function browser() {
    const items = new Map<string, string>();
    let destination = "";
    Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: {
            getItem: (key: string) => items.get(key) ?? null,
            setItem: (key: string, value: string) => items.set(key, value),
            removeItem: (key: string) => items.delete(key)
        }
    });
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            location: {
                origin: "http://localhost:5173",
                assign: (url: string) => {
                    destination = url;
                }
            }
        }
    });
    return { items, url: () => new URL(destination) };
}
test("Google authorization binds a single-use state, nonce and S256 PKCE to its callback", async () => {
    const b = browser();
    await startOAuth("OAUTH_GOOGLE", "test-client", "/favorites");
    const url = b.url();
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(
        url.searchParams.get("redirect_uri"),
        "http://localhost:5173/authcallback/OAUTH_GOOGLE"
    );
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.has("client_secret"), false);
    assert.equal(url.searchParams.has("code_verifier"), false);
    const pending = consumeOAuth("OAUTH_GOOGLE", "login", url.searchParams.get("state"));
    assert.equal(pending.returnTo, "/favorites");
    assert.equal(pending.nonce, url.searchParams.get("nonce"));
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(pending.codeVerifier)
    );
    assert.equal(Buffer.from(digest).toString("base64url"), url.searchParams.get("code_challenge"));
    assert.throws(() => consumeOAuth("OAUTH_GOOGLE", "login", url.searchParams.get("state")));
});
test("provider and login/signup state cannot be swapped", async () => {
    const b = browser();
    await startOAuth("OAUTH_GOOGLE", "test-client", "/favorites", "signup", "독자");
    const googleState = b.url().searchParams.get("state");
    assert.equal(
        b.url().searchParams.get("redirect_uri"),
        "http://localhost:5173/signupcallback/OAUTH_GOOGLE"
    );
    await startOAuth("OAUTH_NAVER", "naver-client", "/");
    assert.equal(b.url().hostname, "nid.naver.com");
    assert.equal(b.url().searchParams.has("code_challenge"), false);
    assert.throws(() => consumeOAuth("OAUTH_GOOGLE", "login", googleState));
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "signup", googleState));
    assert.equal(consumeOAuth("OAUTH_GOOGLE", "signup", googleState).userName, "독자");
    assert.equal(
        consumeOAuth("OAUTH_NAVER", "login", b.url().searchParams.get("state")).provider,
        "OAUTH_NAVER"
    );
});
test("OAuth rejects expired, future, malformed and mismatched state", async () => {
    const b = browser();
    const key = "weeklycomma:oauth:OAUTH_NAVER:login";
    const seed = (change = {}) =>
        b.items.set(
            key,
            JSON.stringify({
                provider: "OAUTH_NAVER",
                purpose: "login",
                state: "nonce",
                createdAt: Date.now(),
                returnTo: "/favorites",
                ...change
            })
        );
    seed();
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "login", "different"));
    seed({ createdAt: Date.now() - 16 * 60 * 1000 });
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "login", "nonce"));
    seed({ createdAt: Date.now() + 60_000 });
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "login", "nonce"));
    seed({ provider: "OAUTH_GOOGLE" });
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "login", "nonce"));
    b.items.set(key, "malformed");
    assert.throws(() => consumeOAuth("OAUTH_NAVER", "login", "nonce"));
    await assert.rejects(startOAuth("OAUTH_GOOGLE", undefined, "/"));
    await assert.rejects(startOAuth("OAUTH_GOOGLE", "test-client", "/", "signup", ""));
    assert.equal(isOAuthProvider("LOCAL"), false);
    assert.equal(isOAuthProvider("OAUTH_GOOGLE"), true);
    assert.equal(
        oauthRedirectUri("OAUTH_NAVER", "login"),
        "http://localhost:5173/authcallback/OAUTH_NAVER"
    );
});
