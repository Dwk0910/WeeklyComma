import malgun from "./malgun.woff2";
import HCRBatang from "./HCRBatang.woff2";
import Suite from "./suite.woff2";
import Batang from "./batang.woff2";
import SeoulNamsan from "./SeoulNamsanM.woff2";

export type Font = {
    name: string;
    family: string;
    url: string;
    type: "ttf" | "otf" | "woff" | "woff2";
    attributes?: { [key: string]: string };
};

export const FONTS: Font[] = [
    {
        name: "맑은 고딕",
        family: "malgun",
        url: malgun,
        type: "woff2"
    },
    {
        name: "함초롬바탕",
        family: "HCRBatang",
        url: HCRBatang,
        type: "woff2"
    },
    {
        name: "바탕체",
        family: "Batang",
        url: Batang,
        type: "woff2"
    },
    {
        name: "스위트체",
        family: "suite",
        url: Suite,
        type: "woff2"
    },
    {
        name: "서울남산체",
        family: "SeoulNamsan",
        url: SeoulNamsan,
        type: "woff2"
    }
];
