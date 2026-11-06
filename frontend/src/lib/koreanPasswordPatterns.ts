// Modern Hangul syllables decomposed into their standard two-set keyboard keys.
// This is for strength estimation only; it must never change a stored password.
const initials = "r R s e E f a q Q t T d w W c z x v g".split(" ");
const vowels = "k o i O j p u P h hk ho hl y n nj np nl b m ml l".split(" ");
const finals = [
    "",
    ..."r R rt s sw sg e f fr fa fq ft fx fv fg a q qt t T d w c z x v g".split(" ")
];
const compatibility = [
    ..."r R rt s sw sg e E f fr fa fq ft fx fv fg a q Q qt t T d w W c z x v g".split(" "),
    ...vowels
];

export function koreanKeyboardKeys(value: string): string {
    return Array.from(value.normalize("NFC"), (character) => {
        const point = character.codePointAt(0)!;
        const syllable = point - 0xac00;
        if (syllable >= 0 && syllable < 11172)
            return (
                initials[Math.floor(syllable / 588)] +
                vowels[Math.floor((syllable % 588) / 28)] +
                finals[syllable % 28]
            );
        if (point >= 0x3131 && point <= 0x3163) return compatibility[point - 0x3131];
        if (point >= 0x1100 && point <= 0x1112) return initials[point - 0x1100];
        if (point >= 0x1161 && point <= 0x1175) return vowels[point - 0x1161];
        if (point >= 0x11a8 && point <= 0x11c2) return finals[point - 0x11a7];
        return character;
    }).join("");
}

// Small supplemental list of predictable phrases, not a general Korean dictionary.
export const koreanPasswordPhrases = [
    "비밀번호",
    "패스워드",
    "안녕하세요",
    "안녕",
    "사랑",
    "사랑해",
    "사랑해요",
    "대한민국",
    "주간쉼표",
    "쉼표지기"
];
