import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { signupPasswordError } from "../../lib/signupPassword.ts";
import { LuTriangleAlert } from "react-icons/lu";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { StrengthAssessment } from "../../lib/passwordStrength.ts";

type Answer = { key: string; assessment?: StrengthAssessment };
export default function PasswordStrength({
    password,
    userName,
    email,
    children
}: {
    password: string;
    userName: string;
    email: string;
    children: ReactNode;
}) {
    const worker = useRef<Worker | null>(null);
    const busy = useRef(false);
    const requestId = useRef(0);
    const [answer, setAnswer] = useState<Answer | null>(null);
    const reduced = useReducedMotion();
    // Retain the last completed estimate while typing; never show a pending label.
    const key = JSON.stringify([password, userName, email]);
    const length = Array.from(password).length;
    useEffect(() => {
        if (!length) {
            const reset = window.setTimeout(() => setAnswer(null), 0);
            return () => window.clearTimeout(reset);
        }
        if (length > 128) return;
        let active = true;
        const id = ++requestId.current;
        const timer = window.setTimeout(() => {
            try {
                worker.current ??= new Worker(
                    new URL("../../lib/passwordStrength.worker.ts", import.meta.url),
                    { type: "module" }
                );
                worker.current.onmessage = (
                    event: MessageEvent<{ id: number; assessment?: StrengthAssessment }>
                ) => {
                    busy.current = false;
                    if (active && event.data.id === id && event.data.assessment)
                        setAnswer({ key, assessment: event.data.assessment });
                };
                worker.current.onerror = () => {
                    busy.current = false;
                    worker.current?.terminate();
                    worker.current = null;
                };

                busy.current = true;
                worker.current.postMessage({
                    id,
                    password,
                    userInputs: [userName.trim(), email.trim(), email.split("@")[0]]
                });
            } catch {
                // Keep the last completed estimate when the worker is unavailable.
                busy.current = false;
                worker.current?.terminate();
                worker.current = null;
            }
        }, 450);
        return () => {
            active = false;
            window.clearTimeout(timer);
            // Discard expensive obsolete work instead of queuing estimates as the
            // user edits a long password. The last completed gauge stays visible.
            if (busy.current) {
                worker.current?.terminate();
                worker.current = null;
                busy.current = false;
            }
        };
    }, [key, password, userName, email, length]);
    useEffect(
        () => () => {
            worker.current?.terminate();
            worker.current = null;
        },
        []
    );
    const result = length > 0 && length <= 128 ? answer?.assessment : undefined;
    const value = result?.value ?? 0;
    const label = result?.label;
    const warn =
        !!result &&
        !!result.warning &&
        answer?.key === key &&
        !!userName.trim() &&
        !!email.trim() &&
        !signupPasswordError(password, { userName, email }) &&
        value < 60;
    const color = value < 40 ? "#89502f" : value < 60 ? "#6b5a18" : "#166044";
    return (
        <>
            <AnimatePresence initial={false}>
                {result && (
                    <motion.div
                        className="password-strength-reveal"
                        initial={reduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.28, ease: "easeOut" }}
                    >
                        <div className="password-strength">
                            <div className="password-strength-header">
                                <span>비밀번호 강도 · {label}</span>
                                <span className="password-strength-value">
                                    <strong>{result ? value : "—"}</strong> / 100
                                </span>
                            </div>
                            <div
                                className="password-strength-track"
                                role="meter"
                                aria-label="비밀번호 강도"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={value}
                                aria-valuetext={result ? `${value}점, ${label}` : label}
                            >
                                <motion.div
                                    className="password-strength-fill"
                                    initial={
                                        reduced ? false : { width: "0%", backgroundColor: color }
                                    }
                                    animate={{ width: `${value}%`, backgroundColor: color }}
                                    transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
            {warn && (
                <p className="password-strength-warning" role="status">
                    <LuTriangleAlert aria-hidden="true" />
                    {result.warning}
                </p>
            )}
        </>
    );
}
