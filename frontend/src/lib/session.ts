export type SessionData = { userName: string; userType: "GENERAL" | "CURATOR"; csrfToken: string };

function isSession(value: unknown): value is SessionData {
    if (!value || typeof value !== "object") return false;
    const data = value as Partial<SessionData>;
    return (
        typeof data.userName === "string" &&
        typeof data.csrfToken === "string" &&
        !!data.csrfToken &&
        (data.userType === "GENERAL" || data.userType === "CURATOR")
    );
}

export function getLSdata(): SessionData | null {
    try {
        const data: unknown = JSON.parse(localStorage.getItem("wca_lsdata") || "null");
        return isSession(data) ? data : null;
    } catch {
        return null;
    }
}

export function saveSession(data: unknown) {
    if (!isSession(data)) throw new Error("Invalid session response");
    localStorage.setItem("wca_lsdata", JSON.stringify(data));
    window.dispatchEvent(new Event("weeklycomma:session-change"));
}
