import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createServer } from "vite";

test("all signup URLs withhold their forms from signed-in sessions", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "weeklycomma-route-tests-"));
    const server = await createServer({
        cacheDir,
        optimizeDeps: { noDiscovery: true, include: [] },
        root: fileURLToPath(new URL("../", import.meta.url)),
        configFile: false,
        server: { middlewareMode: true, hmr: false, ws: false, watch: null }
    });
    let session: string | null = null;
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => session }
    });
    try {
        const {
            default: Signup,
            SignupSocial,
            SignupRegistration
        } = await server.ssrLoadModule("/src/pages/auth/Signup.tsx");
        const { SignupEmail, SignupEmailVerify } = await server.ssrLoadModule(
            "/src/pages/auth/EmailSignup.tsx"
        );
        const registration = renderToString(
            createElement(
                MemoryRouter,
                null,
                createElement(SignupRegistration, {
                    token: "x".repeat(43),
                    email: "verified@example.test",
                    onExisting: () => {}
                })
            )
        );
        assert.match(
            registration,
            /<input[^>]*id="signup-email"[^>]*disabled=""[^>]*value="verified@example.test"/
        );
        const initial = renderToString(
            createElement(MemoryRouter, null, createElement(SignupEmail))
        );
        assert.ok(!initial.includes('type="password"'));
        assert.ok(!initial.includes('name="userName"'));
        for (const [path, route, Component, heading] of [
            ["/signup", "/signup", Signup, "책과 만나는 첫 페이지."],
            ["/signup/email", "/signup/email", SignupEmail, "이메일로 시작하기."],
            [
                "/signup/email/verify",
                "/signup/email/verify",
                SignupEmailVerify,
                "이메일을 확인하고 있어요."
            ],
            [
                "/signup/social/OAUTH_NAVER",
                "/signup/social/:provider",
                SignupSocial,
                "어떤 닉네임으로 만날까요?"
            ],
            [
                "/signup/social/OAUTH_GOOGLE",
                "/signup/social/:provider",
                SignupSocial,
                "어떤 닉네임으로 만날까요?"
            ]
        ] as const) {
            const render = () =>
                renderToString(
                    createElement(
                        MemoryRouter,
                        { initialEntries: [path + "?returnTo=%2Ffavorites"] },
                        createElement(
                            Routes,
                            null,
                            createElement(Route, { path: route, element: createElement(Component) })
                        )
                    )
                );
            session = null;
            assert.ok(render().includes(heading), path + " should be available to guests");
            session = JSON.stringify({
                userName: "Test reader",
                userType: "GENERAL",
                csrfToken: "test-only-session"
            });
            assert.equal(render(), "", path + " must render a redirect instead of signup fields");
        }
    } finally {
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else Reflect.deleteProperty(globalThis, "localStorage");
        await server.close();
        await rm(cacheDir, { recursive: true, force: true });
    }
});
