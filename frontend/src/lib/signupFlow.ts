import { signupPasswordError } from "./signupPassword.ts";

export type SignupFields = {
    userName: string;
    email: string;
    password: string;
    passwordConfirm: string;
};
export type SignupErrors = Partial<Record<keyof SignupFields, string>>;

export function validateSignupName(name: string): string | undefined {
    if (!name.trim()) return "사용할 닉네임을 입력해 주세요.";
    if (name.trim().length > 80) return "닉네임은 80자 이내로 입력해 주세요.";
}

export function validateSignup(values: SignupFields): SignupErrors {
    const errors: SignupErrors = {};
    const nameError = validateSignupName(values.userName);
    if (nameError) errors.userName = nameError;
    const email = values.email.trim();
    if (!email) errors.email = "이메일을 입력해 주세요.";
    else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.email = "이메일 형식을 확인해 주세요.";
    const passwordError = signupPasswordError(values.password, values);
    if (passwordError) errors.password = passwordError;
    if (!values.passwordConfirm) errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
    else if (values.password !== values.passwordConfirm)
        errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    return errors;
}
