import { EditorContent, useEditor } from "@tiptap/react";
import FontStyle from "../assets/fonts/fonts.tsx";
import { createPostExtensions } from "../extensions/postExtensions.ts";
import "./PostContent.css";

const extensions = createPostExtensions(false);

export default function PostContent({
    content,
    ariaLabel = "게시글 본문"
}: {
    content: string;
    ariaLabel?: string;
}) {
    // Parse saved HTML through the writing editor's schema, retaining formatting
    // without copying arbitrary HTML elements or event handlers into the page.
    const editor = useEditor({
        extensions,
        content,
        editable: false,
        editorProps: {
            attributes: {
                class: "post-rich-text",
                role: "document",
                "aria-label": ariaLabel
            }
        }
    });

    return (
        <>
            <FontStyle />
            <EditorContent editor={editor} />
        </>
    );
}
