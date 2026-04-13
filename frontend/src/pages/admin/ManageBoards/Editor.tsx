import { useState } from "react";

import { type PostType } from "./ManageNotifications.tsx";

import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";

// Modules for WYSIWYG editor
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { TextStyle, FontSize, FontFamily } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";

// Editor menu icon
import { FaBold, FaUnderline, FaItalic, FaStrikethrough } from "react-icons/fa6";
import { IoIosArrowDown } from "react-icons/io";

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
            TextStyle,
            FontFamily,
            FontSize,
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

    const editorState = useEditorState({
        editor,
        selector: (snapshot) => {
            return {
                isBold: snapshot.editor.isActive("bold") ?? false,
                canBold: snapshot.editor.can().chain().toggleBold().run() ?? false,
                isItalic: snapshot.editor.isActive("italic") ?? false,
                canItalic: snapshot.editor.can().chain().toggleItalic().run() ?? false,
                isStrike: snapshot.editor.isActive("strike") ?? false,
                canStrike: snapshot.editor.can().chain().toggleStrike().run() ?? false,
                isCode: snapshot.editor.isActive("code") ?? false,
                canCode: snapshot.editor.can().chain().toggleCode().run() ?? false,
                canClearMarks: snapshot.editor.can().chain().unsetAllMarks().run() ?? false,

                // Block types
                isParagraph: snapshot.editor.isActive("paragraph") ?? false,
                isHeading1: snapshot.editor.isActive("heading", { level: 1 }) ?? false,
                isHeading2: snapshot.editor.isActive("heading", { level: 2 }) ?? false,
                isHeading3: snapshot.editor.isActive("heading", { level: 3 }) ?? false,
                isHeading4: snapshot.editor.isActive("heading", { level: 4 }) ?? false,
                isHeading5: snapshot.editor.isActive("heading", { level: 5 }) ?? false,
                isHeading6: snapshot.editor.isActive("heading", { level: 6 }) ?? false,

                // Lists and blocks
                isBulletList: snapshot.editor.isActive("bulletList") ?? false,
                isOrderedList: snapshot.editor.isActive("orderedList") ?? false,
                isCodeBlock: snapshot.editor.isActive("codeBlock") ?? false,
                isBlockquote: snapshot.editor.isActive("blockquote") ?? false,

                // History
                canUndo: snapshot.editor.can().chain().undo().run() ?? false,
                canRedo: snapshot.editor.can().chain().redo().run() ?? false,

                currentFont: snapshot.editor.getAttributes("textStyle").fontFamily ?? "폰트 선택"
            };
        }
    });

    // const [editorConfigurations, setEditorConfigurations] = useState<
    //     (attr: string) => EditorArugments
    // >(() => (attr) => {
    //     return {
    //         isBold: true,
    //         isItalic: true
    //     };
    // });

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
                                    "flex max-w-50 h-8.5 justify-start items-center mr-1 px-2 border border-gray-200 cursor-pointer",
                                    "transition-colors duration-200 ease-in-out hover:bg-gray-200/90"
                                )}
                            >
                                <IoIosArrowDown className={"mr-1 shrink-0"} />
                                <span className={"truncate"}>{editorState.currentFont}</span>
                            </div>
                            <div
                                className={clsx(
                                    "w-8.5 h-8.5 ml-2 border border-gray-500 flex justify-center items-center rounded-xs",
                                    "cursor-pointer transition-[scale,color] hover:scale-110",
                                    editorState.isBold
                                        ? "bg-gray-500 text-white"
                                        : "bg-white text-black"
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
                            <div
                                className={clsx(
                                    "w-8.5 h-8.5 ml-2 bg-gray-500 flex justify-center items-center text-white rounded-xs",
                                    "cursor-pointer transition-[scale] hover:scale-110"
                                )}
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                            >
                                <FaStrikethrough />
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
