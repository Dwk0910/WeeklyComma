import { useState } from "react";

import { type PostType } from "./ManageNotifications.tsx";

import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";

// Modules for WYSIWYG editor
import { useEditor, EditorContent } from "@tiptap/react";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

// Editor menu icon
import { FaBold, FaUnderline, FaItalic } from "react-icons/fa6";

export default function Editor({
    articleType,
    visible
}: {
    articleType: PostType;
    visible: boolean;
}) {
    const [title, setTitle] = useState<string>("");
    const [content, setContent] = useState<string>("");

    const editor = useEditor({
        extensions: [
            StarterKit,
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader
        ],

        content: content,
        onUpdate: ({ editor }) => setContent(editor.getHTML()),

        editorProps: {
            attributes: {
                class: "w-full h-95 p-3 pt-0 outline-none"
            }
        }
    });

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{
                        height: 0
                    }}
                    animate={{
                        height: "500px"
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
                    <input
                        type={"text"}
                        className={
                            "ml-2 w-[95%] px-2 h-10 border-[1.5px] border-b-0 border-gray-300 outline-none"
                        }
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={"제목"}
                    />
                    <div className={"w-[95%] h-110 border-[1.5px] border-gray-300 mx-2"}>
                        <div className={"flex w-full h-9 p-2 ml-1 mb-3"}>
                            <div
                                className={clsx(
                                    "w-8.5 h-8.5 bg-gray-500 flex justify-center items-center text-white rounded-xs",
                                    "cursor-pointer transition-[scale] hover:scale-110"
                                )}
                                onClick={() => editor.chain().focus().toggleBold().run()}
                            >
                                <FaBold />
                            </div>
                            <div
                                className={clsx(
                                    "w-8.5 h-8.5 ml-2 bg-gray-500 flex justify-center items-center text-white rounded-xs",
                                    "cursor-pointer transition-[scale] hover:scale-110"
                                )}
                                onClick={() => editor.chain().focus().toggleUnderline().run()}
                            >
                                <FaUnderline />
                            </div>
                            <div
                                className={clsx(
                                    "w-8.5 h-8.5 ml-2 bg-gray-500 flex justify-center items-center text-white rounded-xs",
                                    "cursor-pointer transition-[scale] hover:scale-110"
                                )}
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                            >
                                <FaItalic />
                            </div>
                        </div>
                        <div className={"overflow-y-auto"}>
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
