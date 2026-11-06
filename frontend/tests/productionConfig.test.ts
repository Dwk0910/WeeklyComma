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
