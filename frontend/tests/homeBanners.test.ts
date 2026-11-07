import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
test("home starts with three banner skeletons instead of empty placeholders", async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), "weeklycomma-home-tests-"));
    const server = await createServer({
        cacheDir,
        root: fileURLToPath(new URL("../", import.meta.url)),
        configFile: false,
        envDir: false,
        optimizeDeps: { noDiscovery: true, include: [] },
        define: {
            "import.meta.env.VITE_BACKEND_PROTOCOL": JSON.stringify("s"),
            "import.meta.env.VITE_BACKEND_ADDRESS": JSON.stringify("/api")
        },
        server: { middlewareMode: true, hmr: false, ws: false, watch: null }
    });
    try {
        const { default: Main } = await server.ssrLoadModule("/src/pages/Main.tsx");
        const markup = renderToString(createElement(MemoryRouter, null, createElement(Main)));
        assert.equal([...markup.matchAll(/aria-label="배너를 불러오는 중"/g)].length, 3);
        assert.ok(!markup.includes("배너가 없습니다"));
        assert.ok(!markup.includes("광고 없음"));
        const { default: HomeBanner } = await server.ssrLoadModule("/src/component/HomeBanner.tsx");
        const image = renderToString(
            createElement(HomeBanner, { fileId: "test-image", alt: "테스트 배너" })
        );
        assert.ok(image.includes('aria-busy="true"'));
        assert.ok(image.includes('aria-label="배너를 불러오는 중"'));
        assert.ok(!image.includes("배너를 불러오지 못했습니다"));
    } finally {
        await server.close();
        await rm(cacheDir, { recursive: true, force: true });
    }
});
