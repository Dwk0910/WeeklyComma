export type PasswordCheck = {
    id: string;
    label: string;
    passed: boolean;
    pending?: boolean;
    completedLabel?: string;
};
export type PasswordContext = { userName: string; email: string };

function includesAccountInfo(password: string, { userName, email }: PasswordContext): boolean {
    const normalized = password.normalize("NFKC").toLowerCase();
    const address = email.normalize("NFKC").trim().toLowerCase();
    return [userName.normalize("NFKC").trim().toLowerCase(), address, address.split("@")[0]]
        .filter(Boolean)
        .some((value) => normalized.includes(value));
}

// Entries in the server blocklist that can meet the 10-character signup minimum.
// A parity test keeps this preview aligned with the server's signup policy.
export const commonSignupPasswords = [
    "1234567890",
    "fuck_inside",
    "deepthroat",
    "qwertyuiop",
    "basketball",
    "masterbate",
    "penetration",
    "masterbating",
    "unbelievable",
    "intercourse",
    "interacial",
    "ejaculation",
    "businessbabe",
    "experience",
    "contortionist",
    "cheerleaers",
    "housewifes",
    "gangbanged",
    "experienced",
    "transexual",
    "lockerroom",
    "absolutely",
    "masterbaiting",
    "masturbation",
    "pornographic",
    "knickerless",
    "enterprise",
    "scandinavian",
    "techniques",
    "manchester",
    "penetrating",
    "films+pic+galeries",
    "uncencored",
    "insertions",
    "fuckinside",
    "quant4307s",
    "christopher",
    "california",
    "cocksucker",
    "washington",
    "postov1000",
    "charlie123",
    "primetime21",
    "dragonball",
    "highlander",
    "playstation",
    "undertaker",
    "university",
    "1q2w3e4r5t",
    "motherfucker",
    "peternorth",
    "passwordpassword",
    "passwordpassword123",
    "123456789012345",
    "1234567890123456",
    "qwertyuiopasdfgh",
    "qwertyuiopasdfghjkl",
    "iloveyouiloveyou",
    "weeklycommaweeklycomma"
] as const;
const common = new Set<string>(commonSignupPasswords);

export function signupPasswordError(
    password: string,
    context: PasswordContext
): string | undefined {
    const characters = Array.from(password);
    if (!password.trim()) return "비밀번호를 입력해 주세요.";
    if (characters.length < 10 || characters.length > 128)
        return "비밀번호는 10~128자로 입력해 주세요.";
    if (
        characters.some((character) => {
            const point = character.codePointAt(0)!;
            return point >= 0xd800 && point <= 0xdfff;
        })
    )
        return "비밀번호에 입력할 수 없는 문자가 있습니다.";
    if (!/[a-z]/.test(password)) return "영문 소문자를 포함해 주세요.";
    if (!/[A-Z0-9\p{P}\p{S}]/u.test(password))
        return "숫자·영문 대문자·특수문자 중 하나 이상 포함해 주세요.";
    if (includesAccountInfo(password, context))
        return "닉네임이나 이메일의 @ 앞부분을 비밀번호에 포함하지 마세요.";
    if (new Set(characters).size === 1)
        return "한 글자만 반복한 비밀번호입니다. 다른 비밀번호를 입력해 주세요.";
    if (common.has(password.toLowerCase()))
        return "이미 널리 쓰이는 비밀번호입니다. 다른 비밀번호를 입력해 주세요.";
}

export function passwordChecks(password: string, context: PasswordContext): PasswordCheck[] {
    const length = Array.from(password).length;
    const error = signupPasswordError(password, context);
    const lengthValid = !!password.trim() && length >= 10 && length <= 128;
    const accountPending =
        !password ||
        !context.userName.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(context.email.trim());
    const checks: PasswordCheck[] = [
        {
            id: "length",
            label: length > 128 ? "128자 이내로 입력하기" : "10자 이상 입력하기",
            completedLabel: "길이 조건 충족",
            passed: lengthValid
        },
        {
            id: "lowercase",
            label: "영문 소문자 포함",
            completedLabel: "영문 소문자 포함",
            passed: /[a-z]/.test(password)
        },
        {
            id: "combination",
            label: "숫자·대문자·특수문자 중 하나 포함",
            completedLabel: "숫자·대문자·특수문자 중 하나 포함",
            passed: /[A-Z0-9\p{P}\p{S}]/u.test(password)
        },
        {
            id: "account-info",
            label: accountPending ? "닉네임·이메일 입력 후 확인" : "닉네임·이메일(@ 앞부분) 제외",
            pending: accountPending,
            passed: !accountPending && !includesAccountInfo(password, context)
        }
    ];
    if (checks.every((check) => check.passed) && error)
        checks.push({ id: "blocked", label: error, passed: false });
    return checks;
}

export function passwordConfirmationChecks(
    password: string,
    confirmation: string
): PasswordCheck[] {
    return [
        {
            id: "match",
            label: "위 비밀번호와 동일하게 입력하기",
            completedLabel: "비밀번호가 일치합니다",
            passed: !!confirmation && password === confirmation
        }
    ];
}
