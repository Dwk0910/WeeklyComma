import * as React from "react";
import { useState, useEffect, useRef } from "react";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { FontSize } from "../../../extensions/FontSize.ts";
import FontStyle, { FONTS } from "../../../assets/fonts/fonts.tsx";
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
    LuChevronDown
} from "react-icons/lu";

const extensions = [
    StarterKit,
    TextStyle,
    FontFamily,
    FontSize,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader
];

// 외부 클릭 감지를 위한 커스텀 훅
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

const ToolbarBtn = ({ onClick, active, icon: Icon, title, disabled }: any) => (
    <button
        onClick={(e) => {
            e.preventDefault();
            onClick();
        }}
        title={title}
        disabled={disabled}
        className={clsx(
            "p-1.5 rounded transition-colors",
            disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-200 cursor-pointer",
            active ? "bg-gray-200 text-blue-600" : "text-gray-600"
        )}
    >
        <Icon size={18} />
    </button>
);

export default function Editor({
    articleType,
    visible
}: {
    articleType: string;
    visible: boolean;
}) {
    const [title, setTitle] = useState<string>("");
    const [fontSizeState, setFontSizeState] = useState<number>(16);

    // 드롭다운 열림 상태
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
            canUndo: ctx.editor.can().undo(),
            canRedo: ctx.editor.can().redo(),
            fontSize: ctx.editor.getAttributes("textStyle").fontSize || "16px",
            // 현재 선택된 폰트 패밀리 가져오기
            fontFamily: ctx.editor.getAttributes("textStyle").fontFamily || "sans-serif"
        })
    });

    // 외부 클릭 시 드롭다운 닫기
    useOutsideClick(fontDropdownRef, () => setFontDropdownOpen(false));

    useEffect(() => {
        (() => {
            const size = parseFloat(editorState.fontSize.replace("px", ""));
            if (!isNaN(size)) setFontSizeState(size);
        })();
    }, [editorState.fontSize]);

    if (!editor) return null;

    const applyFontSize = (size: number) => {
        const cleanSize = Math.max(0.5, size);
        setFontSizeState(cleanSize);
        editor.chain().focus().setFontSize(`${cleanSize}px`).run();
    };

    // 현재 선택된 폰트 객체 찾기
    const currentFont = FONTS.find((f) => f.family === editorState.fontFamily) || FONTS[0];

    useEffect(() => {
        // 찾은 폰트가 없어 FONTS[0]으로 설정되었을 경우 editor.chain()...을 통해 수동으로 직접 설정해주어 State와 상태를 맞춰야 함
        if (currentFont == FONTS[0]) {
            editor.chain().focus().setFontFamily(FONTS[0].family).run();
        }
    }, []);

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
                    {/* @font-face 주입 */}
                    <FontStyle />
                    <style>{`
                        .prose ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
                        .prose ol { list-style-type: decimal !important; padding-left: 1.5rem !important; }
                        .prose blockquote { border-left: 4px solid #ccc; padding-left: 1rem; font-style: italic; color: #666; }
                        .prose pre { background-color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
                        .prose code { background-color: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
                    `}</style>

                    <input
                        type="text"
                        className="w-full px-4 py-2 border-b border-gray-300 outline-none text-lg font-bold"
                        placeholder="제목을 입력하세요"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-300 bg-gray-50/50 relative z-10">
                        {/* 커스텀 폰트 드롭다운 */}
                        <div className="relative" ref={fontDropdownRef}>
                            <button
                                onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                                className="flex items-center gap-2 text-sm px-3 py-1.5 border border-gray-300 rounded bg-white outline-none hover:border-gray-400 min-w-35 justify-between"
                                title="폰트 패밀리"
                                // 버튼 자체에도 현재 폰트 스타일 적용
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

                            {/* 드롭다운 목록 */}
                            <AnimatePresence>
                                {fontDropdownOpen && (
                                    <motion.ul
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.15 }}
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

                        {/* 폰트 사이즈 컨트롤 */}
                        <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden">
                            <button
                                onClick={() => applyFontSize(fontSizeState - 1)}
                                className="px-2 py-1 hover:bg-gray-200 border-r border-gray-300"
                            >
                                -
                            </button>
                            <input
                                id="editor-font-size"
                                name="editor-font-size"
                                type="number"
                                step="0.5"
                                value={fontSizeState}
                                onChange={(e) => setFontSizeState(parseFloat(e.target.value) || 0)}
                                onBlur={(e) => applyFontSize(parseFloat(e.target.value) || 16)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                        applyFontSize(parseFloat(e.currentTarget.value) || 16);
                                }}
                                className="w-14 text-center text-sm outline-none bg-transparent"
                                title="폰트 사이즈"
                            />
                            <button
                                onClick={() => applyFontSize(fontSizeState + 1)}
                                className="px-2 py-1 hover:bg-gray-200 border-l border-gray-300"
                            >
                                +
                            </button>
                        </div>

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        {/* Undo/Redo */}
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().undo().run()}
                            icon={LuUndo}
                            title="Undo"
                            disabled={!editorState.canUndo}
                        />
                        <ToolbarBtn
                            onClick={() => editor.chain().focus().redo().run()}
                            icon={LuRedo}
                            title="Redo"
                            disabled={!editorState.canRedo}
                        />

                        <div className="w-px h-6 mx-1 bg-gray-300" />

                        {/* 서식 버튼들 */}
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

                        {/* 리스트/블록 요소 */}
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
