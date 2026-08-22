import { FONTS } from "./FONTS.def.ts";

export default function FontStyle() {
    return (
        <style>{`${FONTS.filter((font) => font.url)
            .map(
                (font) => `
                            @font-face {
                                font-family: '${font.family}';
                                src: url('${font.url}') format('${font.type}');
                                font-display: swap; /* 폰트 로딩 최적화 */
                            }
                        `
            )
            .join("")}
        `}</style>
    );
}
