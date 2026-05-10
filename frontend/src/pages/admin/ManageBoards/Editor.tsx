import * as React from "react";
import { useState, useEffect, useRef } from "react";

import { BACKEND_ADDRESS } from "../../../App.tsx";
import axios from "axios";

import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color"; // 추가
import Highlight from "@tiptap/extension-highlight"; // 추가
import { FontSize } from "../../../extensions/FontSize.ts";
import FontStyle from "../../../assets/fonts/fonts.tsx";
import { FONTS } from "../../../assets/fonts/FONTS.def.ts";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";

import {
    LuBold,
    LuItalic,
    LuUnderline,
    LuStrikethrough,
    LuList,
    LuListOrdered,
    LuQuote,
    LuCode,
    LuUndo,
    LuRedo,
    LuMinus,
    LuChevronDown,
    LuHighlighter,
    LuType,
    LuSave
} from "react-icons/lu";

import { type IconType } from "react-icons";

const extensions = [
    StarterKit,
    TextStyle,
    FontFamily,
    Color, // 추가
    Highlight.configure({ multicolor: true }), // 추가
    FontSize,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader
];

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, callback]);
}

type ToolbarBtnProps = {
    onClick: () => void;
    icon: IconType;
    active?: boolean;
    title?: string;
    disabled?: boolean;
    color?: React.CSSProperties["color"];
};

const ToolbarBtn = ({ onClick, active, icon: Icon, title, disabled, color }: ToolbarBtnProps) => (
    <button
        onClick={(e) => {
            e.preventDefault();
            onClick();
        }}
        title={title}
        disabled={disabled}
        className={clsx(
            "p-1.5 rounded transition-colors relative",
            disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer",
            active ? "bg-gray-200 text-blue-600" : "text-gray-600"
        )}
    >
        <Icon size={18} style={color ? { color } : {}} />
    </button>
);

export default function Editor({
    articleType,
    visible,
    refreshAction,
    closeAction
}: {
    articleType: string;
    visible: boolean;
    refreshAction?: () => void;
    closeAction?: () => void;
}) {
    const [title, setTitle] = useState<string>("");
    const [fontSizeState, setFontSizeState] = useState<number>(16);
    const [fontDropdownOpen, setFontDropdownOpen] = useState<boolean>(false);
    const fontDropdownRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions,
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4"
            }
        }
    });

    const editorState = useEditorState({
        editor,
        selector: (ctx) => ({
            isBold: ctx.editor.isActive("bold"),
            isItalic: ctx.editor.isActive("italic"),
            isUnderline: ctx.editor.isActive("underline"),
            isStrike: ctx.editor.isActive("strike"),
            isBulletList: ctx.editor.isActive("bulletList"),
            isOrderedList: ctx.editor.isActive("orderedList"),
            isBlockquote: ctx.editor.isActive("blockquote"),
            isCodeBlock: ctx.editor.isActive("codeBlock"),
            isHighlight: ctx.editor.isActive("highlight"),
            canUndo: ctx.editor.can().undo(),
            canRedo: ctx.editor.can().redo(),
            fontSize: ctx.editor.getAttributes("textStyle").fontSize || "16px",
            fontFamily: ctx.editor.getAttributes("textStyle").fontFamily || "sans-serif",
            currentColor: ctx.editor.getAttributes("textStyle").color || "#000000",
            highlightColor: ctx.editor.getAttributes("highlight").color || "#ffff00"
        })
    });

    useOutsideClick(fontDropdownRef, () => setFontDropdownOpen(false));

    useEffect(() => {
        const size = parseFloat(editorState.fontSize.replace("px", ""));
        if (!isNaN(size)) (() => setFontSizeState(size))();
    }, [editorState.fontSize]);

    const currentFont = FONTS.find((f) => f.family === editorState.fontFamily) || FONTS[0];

    useEffect(() => {
        if (editor && editorState.fontFamily === "sans-serif" && currentFont === FONTS[0]) {
            editor.chain().focus().setFontFamily(FONTS[0].family).run();
        }
    }, [editor, currentFont, editorState.fontFamily]);

    if (!editor) return null;

    const applyFontSize = (size: number) => {
        const cleanSize = Math.max(0.5, size);
        setFontSizeState(cleanSize);
        editor.chain().focus().setFontSize(`${cleanSize}px`).run();
    };

    const handleSave = () => {
        const content = editor.getHTML();
        axios
            .post(BACKEND_ADDRESS + "post", {
                type: articleType,
                title: title,
                content: content
            })
            .then(() => {
                alert("글이 성공적으로 게시되었습니다.");
                if (!refreshAction) window.location.reload();
                else refreshAction();

                // close action
                if (closeAction) {
                    editor.commands.clearContent();
                    setTitle("");
                    setFontSizeState(16);
                    setFontDropdownOpen(false);
                    closeAction();
                }
            });
    };

    return (
        <AnimatePresence mode="wait">
            {visible && (
                <motion.div
                    key="editor-container"
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginBottom: "20px" }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mx-2 overflow-hidden border border-gray-300 rounded-lg shadow-sm bg-white"
                >
                    <FontStyle />
                    <style>{`
                        .prose ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
                        .prose ol { list-style-type: decimal !important; padding-left: 1.5rem !important; }
                        .prose blockquote { border-left: 4px solid #ccc; padding-left: 1rem; font-style: italic; color: #666; }
                        .prose pre { background-color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
                        .prose code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
                        mark { border-radius: 0.25rem; padding: 0 0.2rem; }
                    `}</style>

                    <div className="flex items-center border-b border-gray-300">
                        <input
                            type="text"
                            className="flex-1 px-4 py-3 outline-none text-lg font-bold"
                            placeholder="제목을 입력하세요"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 mr-4 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            <LuSave size={18} />
                            저장
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50/50 relative z-10">
                        <div className="relative" ref={fontDropdownRef}>
                            <button
                                onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                                className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded bg-white outline-none hover:border-gray-400 min-w-35 justify-between"
                                style={{ fontFamily: currentFont.family }}
                            >
                                {currentFont.name}
                                <LuChevronDown
                                    size={16}
                                    className={clsx(
                                        "transition-transform",
                                        fontDropdownOpen && "rotate-180"
                                    )}
                                />
                            </button>

                            <AnimatePresence>
                                {fontDropdownOpen && (
                                    <motion.ul
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute left-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg z-50 py-1"
                                    >
                                        {FONTS.map((font) => (
                                            <li
                                                key={font.family}
                                                onClick={() => {
                                                    editor
                                                        .chain()
                                                        .focus()
                                                        .setFontFamily(font.family)
                                                        .run();
                                                    setFontDropdownOpen(false);
                                                }}
                                                className={clsx(
                                                    "px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors",
                                                    editorState.fontFamily === font.family &&
                                                        "bg-blue-100 text-blue-700 font-medium"
                                                )}
                                                style={{ fontFamily: font.family }}
                                            >
                                                {font.name}
                                            </li>
                                        ))}
                                    </motion.ul>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden">
                            <button
                                onClick={() => applyFontSize(fontSizeState - 1)}
                                className="px-2 py-1 hover:bg-gray-200 border-r border-gray-300"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                step="0.5"
                                value={fontSizeState}
                                onChange={(e) => setFontSizeState(parseFloat(e.target.value) || 0)}
                                onBlur={(e) => applyFontSize(parseFloat(e.target.value) || 16)}
                                className="w-12 text-center text-xs outline-none bg-transparent"
                            />
                            <button
                                onClick={() => applyFontSize(fontSizeState + 1)}
                                className="px-2 py-1 hover:bg-gray-200 border-l border-gray-300"
                            >
                                +
                            </button>
                        </div>

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        <div className="flex items-center gap-0.5">
                            <label
                                className="p-1.5 rounded hover:bg-gray-200 cursor-pointer flex items-center"
                                title="글자 색상"
                            >
                                <LuType size={18} style={{ color: editorState.currentColor }} />
                                <input
                                    type="color"
                                    className="w-0 h-0 opacity-0 p-0 m-0"
                                    onInput={(e) =>
                                        editor
                                            .chain()
                                            .focus()
                                            .setColor((e.target as HTMLInputElement).value)
                                            .run()
                                    }
                                    value={editorState.currentColor}
                                />
                            </label>

                            <label
                                className={clsx(
                                    "p-1.5 rounded hover:bg-gray-200 cursor-pointer flex items-center",
                                    editorState.isHighlight && "bg-gray-200"
                                )}
                                title="하이라이트"
                            >
                                <LuHighlighter size={18} className={"text-black"} />
                                <input
                                    type="color"
                                    className="w-0 h-0 opacity-0 p-0 m-0"
                                    onInput={(e) =>
                                        editor
                                            .chain()
                                            .focus()
                                            .setHighlight({
                                                color: (e.target as HTMLInputElement).value
                                            })
                                            .run()
                                    }
                                    value={editorState.highlightColor}
                                />
                            </label>
                        </div>

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        <ToolbarBtn
                            onClick={() => editor.chain().focus().undo().run()}
                            icon={LuUndo}
                            disabled={!editorState.canUndo}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().redo().run()}
                            icon={LuRedo}
                            disabled={!editorState.canRedo}
                        />

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            active={editorState.isBold}
                            icon={LuBold}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            active={editorState.isItalic}
                            icon={LuItalic}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            active={editorState.isUnderline}
                            icon={LuUnderline}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            active={editorState.isStrike}
                            icon={LuStrikethrough}
                        />

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            active={editorState.isBulletList}
                            icon={LuList}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            active={editorState.isOrderedList}
                            icon={LuListOrdered}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            active={editorState.isBlockquote}
                            icon={LuQuote}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                            active={editorState.isCodeBlock}
                            icon={LuCode}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            icon={LuMinus}
                        />
                    </div>

                    <div className="overflow-y-auto max-h-125">
                        <EditorContent editor={editor} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
