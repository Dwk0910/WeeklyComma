import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { PasswordCheck } from "../../lib/signupPassword.ts";

export default function PasswordChecklist({
    id,
    visible,
    checks,
    success
}: {
    id: string;
    visible: boolean;
    checks: PasswordCheck[];
    success: string;
}) {
    const reduced = useReducedMotion();
    const complete = checks.every((check) => check.passed);
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        // Let the final check finish drawing before gathering the rows.
        const timer = window.setTimeout(
            () => setSettled(visible && complete),
            visible && complete && !reduced ? 480 : 0
        );
        return () => window.clearTimeout(timer);
    }, [visible, complete, reduced]);
    const merged = complete && settled && checks.length > 1;
    return (
        <>
            <AnimatePresence initial={false}>
                {visible && (
                    <motion.div
                        id={id}
                        className="password-guide"
                        initial={reduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
                    >
                        <div className="password-guide-content">
                            <ul className="password-guide-list">
                                {checks.map((check, index) => {
                                    const hidden = merged && index > 0;
                                    const label =
                                        merged && index === 0
                                            ? success
                                            : check.passed
                                              ? (check.completedLabel ?? check.label)
                                              : check.label;
                                    return (
                                        <motion.li
                                            key={check.id}
                                            aria-hidden={hidden || undefined}
                                            initial={false}
                                            animate={{
                                                height: hidden ? 0 : "auto",
                                                opacity: hidden ? 0 : 1,
                                                y: hidden ? -24 : 0
                                            }}
                                            transition={{
                                                duration: reduced ? 0 : 0.32,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <div
                                                className="password-guide-row"
                                                data-passed={check.passed}
                                                data-pending={check.pending || undefined}
                                            >
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    aria-hidden="true"
                                                >
                                                    <motion.path
                                                        d="M5 10h10"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                        initial={false}
                                                        animate={{
                                                            pathLength: check.pending ? 1 : 0,
                                                            opacity: check.pending ? 1 : 0
                                                        }}
                                                        transition={{
                                                            duration: reduced ? 0 : 0.2,
                                                            ease: "easeOut"
                                                        }}
                                                    />
                                                    <motion.path
                                                        d="m4 10 4 4 8-8"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        initial={false}
                                                        animate={{
                                                            pathLength: check.pending ? 0 : 1,
                                                            opacity: check.pending ? 0 : 1
                                                        }}
                                                        transition={{
                                                            duration: reduced ? 0 : 0.3,
                                                            ease: "easeOut"
                                                        }}
                                                    />
                                                    <motion.path
                                                        className="password-guide-check"
                                                        d="m4 10 4 4 8-8"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        initial={{ pathLength: 0, opacity: 0 }}
                                                        animate={{
                                                            pathLength: check.passed ? 1 : 0,
                                                            opacity: check.passed ? 1 : 0
                                                        }}
                                                        transition={{
                                                            pathLength: {
                                                                duration: reduced ? 0 : 0.36,
                                                                ease: "easeOut"
                                                            },
                                                            opacity: {
                                                                duration: reduced ? 0 : 0.16
                                                            }
                                                        }}
                                                    />
                                                </svg>
                                                <span className="password-guide-text">
                                                    <AnimatePresence initial={false} mode="wait">
                                                        <motion.span
                                                            key={label}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{
                                                                duration: reduced ? 0 : 0.12
                                                            }}
                                                        >
                                                            <span className="sr-only">
                                                                {check.pending
                                                                    ? "대기: "
                                                                    : check.passed
                                                                      ? "충족: "
                                                                      : "미충족: "}
                                                            </span>
                                                            {label}
                                                        </motion.span>
                                                    </AnimatePresence>
                                                </span>
                                            </div>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <span className="sr-only" role="status" aria-atomic="true">
                {visible && complete ? success : ""}
            </span>
        </>
    );
}
