import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnTo, validateLogin, consumeNaverLogin } from "../src/lib/loginFlow.ts";

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
test("OAuth state is bound to this tab, expires, and can only be consumed once", () => {
    let item: string | null = null;
    Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        value: {
            getItem: () => item,
            removeItem: () => {
                item = null;
            }
        }
    });
    const seed = (state = "nonce", createdAt = Date.now()) => {
        item = JSON.stringify({ state, createdAt, returnTo: "/favorites" });
    };
    seed();
    assert.equal(consumeNaverLogin("nonce"), "/favorites");
    assert.throws(() => consumeNaverLogin("nonce"));
    seed();
    assert.throws(() => consumeNaverLogin("different"));
    seed("nonce", Date.now() - 16 * 60 * 1000);
    assert.throws(() => consumeNaverLogin("nonce"));
    item = "malformed";
    assert.throws(() => consumeNaverLogin("nonce"));
});
