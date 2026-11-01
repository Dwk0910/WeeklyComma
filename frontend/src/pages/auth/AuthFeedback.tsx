import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LuCircleAlert } from "react-icons/lu";

export default function ErrorMessage({ id, message }: { id: string; message?: string }) {
    const reduced = useReducedMotion();
    return (
        <AnimatePresence initial={false}>
            {message && (
                <motion.div
                    key={message}
                    id={id}
                    className="login-error-space"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0 : 0.2 }}
                >
                    <p className="login-error" role="alert">
                        <LuCircleAlert aria-hidden="true" />
                        <span>{message}</span>
                    </p>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
