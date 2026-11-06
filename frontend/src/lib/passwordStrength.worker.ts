import { assessPassword } from "./passwordStrength.ts";

// This worker only computes locally. Never send the input or match tokens back.
self.onmessage = (event: MessageEvent<{ id: number; password: string; userInputs: string[] }>) => {
    const { id, password, userInputs } = event.data;
    try {
        self.postMessage({ id, assessment: assessPassword(password, userInputs) });
    } catch {
        self.postMessage({ id, error: true });
    }
};
