import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("same-origin API paths have exactly one API prefix", async () => {
    const server = await createServer({
        root: fileURLToPath(new URL("../", import.meta.url)),
        mode: "production",
        configFile: false,
        envDir: false,
        define: {
            "import.meta.env.VITE_BACKEND_PROTOCOL": JSON.stringify("s"),
            "import.meta.env.VITE_BACKEND_ADDRESS": JSON.stringify("/api")
        },
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false, ws: false, watch: null }
    });
    try {
        const { api } = await server.ssrLoadModule("/src/lib/api.ts");
        assert.equal(api.getUri({ url: "authsessions/me" }), "/api/authsessions/me");
        assert.equal(api.getUri({ url: "files/cover" }), "/api/files/cover");
        assert.equal(api.getUri({ url: "books" }), "/api/books");
    } finally {
        await server.close();
    }
});
