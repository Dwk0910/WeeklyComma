import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { InternalAxiosRequestConfig } from "axios";

test("book search distinguishes provider failures from empty results and preserves either source", async () => {
    const server = await createServer({
        root: fileURLToPath(new URL("../", import.meta.url)),
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
        const { searchBookSources } = await server.ssrLoadModule("/src/lib/bookSearch.ts");
        const calls: string[] = [];
        let registeredFails = false;
        let externalFails = true;
        let externalEmpty = false;
        api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
            calls.push(config.url!);
            assert.equal(config.params.query, "데미안");
            const external = config.url === "books/api";
            if (external ? externalFails : registeredFails) {
                throw {
                    isAxiosError: true,
                    response: {
                        status: 503,
                        data: {
                            message: external
                                ? "국립중앙도서관 API 인증키가 설정되지 않았습니다."
                                : "등록된 책 조회 실패"
                        }
                    }
                };
            }
            return {
                config,
                status: 200,
                statusText: "OK",
                headers: {},
                data:
                    external && externalEmpty
                        ? []
                        : [{ isbn: external ? "new-book" : "saved-book", title: "데미안" }]
            };
        };

        const partial = await searchBookSources("데미안");
        assert.equal(partial.registered[0].isbn, "saved-book");
        assert.equal(partial.registered[0].dbExist, true);
        assert.equal(partial.errors.registered, null);
        assert.match(partial.errors.external, /인증키/);
        assert.deepEqual(partial.external, []);
        assert.deepEqual(calls, ["books", "books/api"]);

        externalFails = false;
        registeredFails = true;
        const externalOnly = await searchBookSources("데미안");
        assert.equal(externalOnly.external[0].isbn, "new-book");
        assert.equal(externalOnly.external[0].dbExist, false);
        assert.ok(externalOnly.errors.registered);
        assert.equal(externalOnly.errors.external, null);

        registeredFails = false;
        externalEmpty = true;
        const empty = await searchBookSources("데미안");
        assert.deepEqual(empty.external, []);
        assert.equal(empty.errors.external, null);

        api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
            const external = config.url === "books/api/search";
            if (external) {
                assert.equal(config.params.author, "백은별");
                assert.equal(config.params.page, 2);
            }
            return {
                config,
                status: 200,
                statusText: "OK",
                headers: {},
                data: external
                    ? { items: [], page: 2, total: 61, hasMore: true }
                    : [{ isbn: "saved-book", author: "다른 저자" }]
            };
        };
        const filteredPage = await searchBookSources("시한부", undefined, {
            author: "백은별",
            page: 2
        });
        assert.deepEqual(filteredPage.registered, []);
        assert.deepEqual(filteredPage.external, []);
        assert.equal(filteredPage.page, 2);
        assert.equal(filteredPage.total, 61);
        assert.equal(filteredPage.hasMore, true);
    } finally {
        await server.close();
    }
});
