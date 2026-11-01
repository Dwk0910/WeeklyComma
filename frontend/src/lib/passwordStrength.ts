import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import { dictionary as commonDictionary, adjacencyGraphs } from "@zxcvbn-ts/language-common";
import { dictionary as englishDictionary } from "@zxcvbn-ts/language-en";
import { dictionary as koreanDictionary } from "@zxcvbn-ts/language-ko";
import { koreanKeyboardKeys, koreanPasswordPhrases } from "./koreanPasswordPatterns.ts";
import { commonSignupPasswords } from "./signupPassword.ts";

const koreanWords = { ...koreanDictionary, koreanPasswordPhrases };
const keyboardWords = Object.fromEntries(
    Object.entries(koreanWords).map(([name, words]) => [
        `${name}-keyboard`,
        words.map(koreanKeyboardKeys).filter((word) => word.length >= 3)
    ])
);

const estimator = new ZxcvbnFactory({
    graphs: adjacencyGraphs,
    dictionary: {
        ...commonDictionary,
        ...englishDictionary,
        ...koreanWords,
        ...keyboardWords,
        signupBlocklist: [...commonSignupPasswords]
    }
});
// Fuzzy matching every large dictionary was too slow. Limit one-character edits
// to common passwords/words and the user's context; exact matching stays broad.
const similarEstimator = new ZxcvbnFactory({
    dictionary: {
        "passwords-common": commonDictionary["passwords-common"].slice(0, 2000),
        "commonWords-en": englishDictionary["commonWords-en"].slice(0, 1000),
        koreanPasswordPhrases,
        koreanKeyboardPhrases: koreanPasswordPhrases.map(koreanKeyboardKeys)
    },
    useLevenshteinDistance: true,
    levenshteinThreshold: 1
});
export type StrengthAssessment = { value: number; label: string; warning: string | null };

// A display scale, not a probability or an estimate of time to crack.
// Keeping the log-guess estimate instead of the library's 0–4 categories
// preserves useful small changes while capping the display at 100.
// Keep the warning/high boundary at log10(guesses) = 12. Only compress the
// upper range, reaching 100 at 18 instead of 20; this is a product display scale.
export function strengthValue(guessesLog10: number): number {
    if (!Number.isFinite(guessesLog10)) return 0;
    const scaled = guessesLog10 <= 12 ? guessesLog10 * 5 : 60 + (guessesLog10 - 12) * (40 / 6);
    return Math.max(0, Math.min(100, Math.round(scaled)));
}
export function assessPassword(password: string, userInputs: string[] = []): StrengthAssessment {
    if (!password || Array.from(password).length > 128)
        throw new Error("Unsupported password length");
    const inputs = ["weeklycomma", "주간쉼표", "비밀번호", ...userInputs]
        .map((value) => value.normalize("NFKC").trim())
        .filter(Boolean);
    const contextualWords = [
        ...new Set(
            inputs.flatMap((value) => [
                value,
                koreanKeyboardKeys(value),
                ...value.split(/[\s@._+-]+/u).filter((part) => Array.from(part).length >= 2)
            ])
        )
    ];
    const normalized = password.normalize("NFKC");
    const variants = new Set([password, normalized, koreanKeyboardKeys(normalized)]);
    let result = estimator.check(password, contextualWords);
    let readableResult = result;
    // Use the weakest plausible representation; decorative Unicode or a keyboard
    // language switch must not make an obvious pattern appear random.
    for (const variant of variants) {
        if (variant.length > 256) continue;
        if (variant !== password) {
            const candidate = estimator.check(variant, contextualWords);
            if (variant === normalized) readableResult = candidate;
            if (candidate.guessesLog10 < result.guessesLog10) result = candidate;
        }
        const similar = similarEstimator.check(variant, contextualWords);
        if (variant === normalized && similar.guessesLog10 < readableResult.guessesLog10)
            readableResult = similar;
        if (similar.guessesLog10 < result.guessesLog10) result = similar;
    }
    const value = strengthValue(result.guessesLog10);
    const label =
        value < 20
            ? "매우 낮음"
            : value < 40
              ? "낮음"
              : value < 60
                ? "보통"
                : value < 80
                  ? "높음"
                  : "매우 높음";
    const significant = result.sequence.filter((match) => match.token.length >= 3);
    // A tiny repeat or one created by keyboard projection can affect the score,
    // but does not justify telling the user their password is mainly repetitive.
    const dominantRepeat = readableResult.sequence.some((match) => {
        const length = Array.from(match.token).length;
        return (
            match.pattern === "repeat" && length >= 4 && length * 2 >= Array.from(normalized).length
        );
    });
    let warning: string | null = null;
    if (value < 60) {
        if (dominantRepeat) warning = "반복되는 구간이 큰 비중을 차지해요.";
        else if (
            significant.some(
                (match) => match.pattern === "sequence" || match.pattern === "wordSequence"
            )
        )
            warning = "순서대로 이어지는 패턴이 포함되어 있어요.";
        else if (significant.some((match) => match.pattern === "spatial"))
            warning = "키보드 배열을 따라가는 패턴이 있어요.";
        else if (
            significant.some(
                (match) =>
                    match.pattern === "dictionary" &&
                    "dictionaryName" in match &&
                    match.dictionaryName !== "userInputs"
            )
        )
            warning = "흔한 단어나 그 변형이 포함되어 있어요.";
    }
    return { value, label, warning };
}
