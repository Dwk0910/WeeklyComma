import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { FontSize } from "./FontSize.ts";

export const createPostExtensions = (editable: boolean) => [
    StarterKit,
    TextStyle,
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    FontSize,
    Table.configure({ resizable: editable }),
    TableRow,
    TableCell,
    TableHeader
];
