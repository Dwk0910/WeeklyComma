import { ipAddress, rewrite } from "@vercel/functions";

export default function proxy(request: Request): Response {
    const url = new URL(request.url);
    const secret = process.env.BACKEND_PROXY_SECRET;
    const origin = process.env.BACKEND_ORIGIN;
    const client = ipAddress(request);
    if (!origin || !secret || secret.length < 32 || !client) {
        return new Response("API proxy is not configured", { status: 503 });
    }
    const destination = new URL(origin);
    if (
        destination.protocol !== "https:" ||
        destination.username ||
        destination.password ||
        destination.pathname !== "/" ||
        destination.search ||
        destination.hash
    ) {
        return new Response("API proxy is not configured", { status: 503 });
    }
    destination.pathname = url.pathname.slice("/api".length) || "/";
    destination.search = url.search;
    const headers = new Headers(request.headers);
    // Always replace client-supplied values before authenticating the forwarded IP.
    headers.set("X-WeeklyComma-Proxy-Secret", secret);
    headers.set("X-WeeklyComma-Client-IP", client);
    return rewrite(destination, {
        request: { headers },
        headers: { "Cache-Control": "no-store" }
    });
}
