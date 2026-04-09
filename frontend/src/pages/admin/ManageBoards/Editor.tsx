import { type PostType } from "./ManageNotifications.tsx";
import { AnimatePresence, motion } from "framer-motion";

export default function Editor({
    articleType,
    visible
}: {
    articleType: PostType;
    visible: boolean;
}) {
    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{
                        height: 0
                    }}
                    animate={{
                        height: "300px"
                    }}
                    exit={{
                        height: 0
                    }}
                    transition={{
                        ease: "easeInOut",
                        duration: 0.35
                    }}
                    style={{ overflow: "hidden" }}
                >
                    <span className={"ml-2 font-seoulnamsan"}>글 작성기</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
