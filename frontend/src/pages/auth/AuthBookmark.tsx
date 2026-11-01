import { motion, useReducedMotion } from "framer-motion";

export default function AuthBookmark() {
    const reduced = useReducedMotion();
    return (
        <svg className="login-ribbon" viewBox="0 0 25 45" aria-hidden="true" focusable="false">
            <motion.path
                d="M0.75 0.75H24.25V43.5L12.5 35.25L0.75 43.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                initial={reduced ? false : { pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 1 }}
                transition={{
                    pathLength: { duration: reduced ? 0 : 0.85, ease: "easeInOut" },
                    fillOpacity: {
                        delay: reduced ? 0 : 0.85,
                        duration: reduced ? 0 : 0.4,
                        ease: "easeIn"
                    }
                }}
            />
        </svg>
    );
}
