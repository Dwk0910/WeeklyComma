import assert from "node:assert/strict";
import test from "node:test";
import config from "../vite.config.ts";

test("production rejects loopback or external API overrides from deployment variables", () => {
    const original = process.env.VITE_BACKEND_ADDRESS;
    try {
        for (const address of ["127.0.0.1", "backend.example.test"]) {
            process.env.VITE_BACKEND_ADDRESS = address;
            assert.throws(
                () => config({ command: "build", mode: "production" }),
                /Production API settings/
            );
        }
    } finally {
        if (original === undefined) delete process.env.VITE_BACKEND_ADDRESS;
        else process.env.VITE_BACKEND_ADDRESS = original;
    }
});

test("Vercel reports missing or malformed proxy settings without leaking their values", () => {
    const keys = [
        "VERCEL",
        "VITE_BACKEND_PROTOCOL",
        "VITE_BACKEND_ADDRESS",
        "BACKEND_ORIGIN",
        "BACKEND_PROXY_SECRET"
    ];
    const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
        process.env.VERCEL = "1";
        process.env.VITE_BACKEND_PROTOCOL = "s";
        process.env.VITE_BACKEND_ADDRESS = "/api";
        process.env.BACKEND_ORIGIN = "";
        process.env.BACKEND_PROXY_SECRET = "";
        const build = () => config({ command: "build", mode: "production" });
        assert.throws(build, /Set BACKEND_ORIGIN in Vercel/);
        process.env.BACKEND_ORIGIN = "not-a-url";
        assert.throws(build, /complete HTTPS origin/);
        process.env.BACKEND_ORIGIN = "http://backend.example.test";
        assert.throws(build, /must be an HTTPS origin/);
        process.env.BACKEND_ORIGIN = "https://backend.example.test";
        assert.throws(build, /Set BACKEND_PROXY_SECRET/);
        process.env.BACKEND_PROXY_SECRET = "test-secret-".repeat(4);
        assert.doesNotThrow(build);
    } finally {
        for (const key of keys) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
        }
    }
});
