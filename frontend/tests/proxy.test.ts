import assert from "node:assert/strict";
import test from "node:test";
import proxy from "../proxy.ts";
import { readFileSync } from "node:fs";

test("large attachment uploads bypass routing middleware while API routes precede the SPA", () => {
    const routing = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
    assert.deepEqual(routing.proxy.matcher, ["/api/authsessions/:path*", "/api/users/:path*"]);
    assert.equal(routing.rewrites[0].source, "/api/:path*");
    assert.equal(new URL(routing.rewrites[0].destination).protocol, "https:");
    assert.equal(routing.rewrites.at(-1).destination, "/index.html");
});

test("API proxy fixes the upstream and replaces spoofed client headers", () => {
    process.env.BACKEND_ORIGIN = "https://backend.example.test";
    process.env.BACKEND_PROXY_SECRET = "test-secret-".repeat(4);
    try {
        const response = proxy(
            new Request("https://site.example.test/api/books?query=hello", {
                headers: {
                    "x-real-ip": "198.51.100.1",
                    "x-weeklycomma-client-ip": "203.0.113.1",
                    "x-weeklycomma-proxy-secret": "forged"
                }
            })
        );
        assert.equal(
            response.headers.get("x-middleware-rewrite"),
            "https://backend.example.test/books?query=hello"
        );
        assert.equal(
            response.headers.get("x-middleware-request-x-weeklycomma-client-ip"),
            "198.51.100.1"
        );
        assert.equal(
            response.headers.get("x-middleware-request-x-weeklycomma-proxy-secret"),
            process.env.BACKEND_PROXY_SECRET
        );
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assert.equal(proxy(new Request("https://site.example.test/api/books")).status, 503);
        process.env.BACKEND_ORIGIN = "not-a-url";
        assert.equal(
            proxy(
                new Request("https://site.example.test/api/books", {
                    headers: { "x-real-ip": "198.51.100.1" }
                })
            ).status,
            503
        );
        process.env.BACKEND_ORIGIN = "http://backend.example.test";
        assert.equal(
            proxy(
                new Request("https://site.example.test/api/books", {
                    headers: { "x-real-ip": "198.51.100.1" }
                })
            ).status,
            503
        );
    } finally {
        delete process.env.BACKEND_ORIGIN;
        delete process.env.BACKEND_PROXY_SECRET;
    }
});
