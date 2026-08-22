// src/types/tiptap-fontsize.d.ts

declare module "tiptap-fontsize-extension" {
    import { Extension } from "@tiptap/core";

    interface FontSizeOptions {
        types: string[];
        defaultSize: string;
    }

    const FontSize: Extension<FontSizeOptions>;
    export default FontSize;
}
