import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    commonSignupPasswords,
    passwordChecks,
    passwordConfirmationChecks,
    signupPasswordError
} from "../src/lib/signupPassword.ts";
import { validateSignup } from "../src/lib/signupFlow.ts";
const context = { userName: "독자", email: "reader@example.test" };
const ready = (password: string) =>
    passwordChecks(password, context).every((check) => check.passed);

test("live checks and submission agree on Unicode, whitespace, length and weak passwords", () => {
    for (const password of [
        "",
        " ".repeat(20),
        "a".repeat(15),
        "abcd",
        "가📚".repeat(64),
        "가📚".repeat(65),
        "abcdefghijklmno\ud800",
        "책을 읽고 잠깐 쉬어가는 시간a1",
        "PasswordPassword123"
    ]) {
        const errors = validateSignup({
            userName: "독자",
            email: "reader@example.test",
            password,
            passwordConfirm: password
        });
        assert.equal(ready(password), !errors.password);
    }
    assert.ok(passwordChecks("", context).every((check) => !check.passed));
    assert.ok(ready("책을 읽고 잠깐 쉬어가는 시간a1"));
});
test("completion reverses when the password or confirmation changes", () => {
    const password = "책을 읽고 잠깐 쉬어가는 시간a1";
    const matched = (value: string, confirmation: string) =>
        passwordConfirmationChecks(value, confirmation).every((check) => check.passed);
    assert.equal(matched("", ""), false);
    assert.equal(matched("short", "short"), true);
    assert.equal(ready("short"), false); // Matching does not make the password eligible.
    assert.equal(matched(password, ""), false);
    assert.equal(matched(password, password), true);
    assert.equal(matched(password + " ", password), false);
    assert.equal(matched(password, password + " "), false);
    assert.equal(matched(password + " ", password + " "), true);
    assert.equal(ready(password.slice(0, 10)), false);
});
test("client preview covers every server blocklisted password at the signup minimum", () => {
    const dictionary = readFileSync(
        new URL("../../backend/src/main/resources/security/common-passwords.txt", import.meta.url),
        "utf8"
    ).split(/\r?\n/);
    const service = readFileSync(
        new URL(
            "../../backend/src/main/java/org/neatore/weeklycomma/service/LoginPasswordService.java",
            import.meta.url
        ),
        "utf8"
    );
    const extra = service.match(/EXTRA_COMMON = Set.of\(([^;]+)\);/)?.[1];
    assert.ok(extra, "Server blocklist declaration changed; update parity check");
    const entries = [
        ...dictionary,
        ...Array.from(extra.matchAll(/"([^"]+)"/g), (match) => match[1])
    ]
        .map((value) => value.toLowerCase())
        .filter((value) => Array.from(value).length >= 10);
    assert.deepEqual(new Set(commonSignupPasswords), new Set(entries));
    for (const value of entries) assert.equal(ready(value.toUpperCase()), false);
});

test("signup requires lowercase plus one of number, uppercase or symbol", () => {
    for (const value of [
        "abcdefghijklmno1",
        "abcdefghijklmnoA",
        "abcdefghijklmno!",
        "가나다라마바사아자차카타파하a📚"
    ])
        assert.equal(ready(value), true, value);
    for (const value of [
        "abcdefghijklmno",
        "ABCDEFGHIJKLMN1",
        "12345678901234567",
        "가나다라마바사아자차카타파하가",
        "abcdefghijklmno "
    ])
        assert.equal(ready(value), false, value);
    const checks = passwordChecks("abc", context);
    assert.deepEqual(
        checks.map((check) => check.id),
        ["length", "lowercase", "combination", "account-info"]
    );
    assert.deepEqual(
        checks.map((check) => check.passed),
        [false, true, false, true]
    );
});

test("account information is excluded case-insensitively and with Unicode normalization", () => {
    for (const password of [
        "Reader-sunrise!482",
        "reader@example.test!482",
        "ＲＥＡＤＥＲ-sunrise!482",
        "독자와읽는책이야기를함께해요a1",
        "독자와읽는책이야기를함께해요a1".normalize("NFD")
    ]) {
        assert.ok(signupPasswordError(password, context), password);
        assert.equal(
            passwordChecks(password, context).find((check) => check.id === "account-info")?.passed,
            false
        );
        assert.ok(validateSignup({ ...context, password, passwordConfirm: password }).password);
    }
    assert.equal(signupPasswordError("unrelated-example.test!482", context), undefined);
    assert.equal(signupPasswordError("vK8!tL3@rQ7#nB5$", { userName: "", email: "" }), undefined);
    assert.ok(signupPasswordError("vK8!tL3@rQ7#nB5$", { ...context, userName: "k" }));
    const password = "forest-orbit-museum!482";
    assert.equal(
        passwordChecks(password, context).every((check) => check.passed),
        true
    );
    for (const changed of [
        { ...context, userName: " Forest " },
        { ...context, email: " ORBIT@example.test " }
    ]) {
        assert.equal(
            passwordChecks(password, changed).every((check) => check.passed),
            false
        );
        assert.ok(validateSignup({ ...changed, password, passwordConfirm: password }).password);
    }
    assert.equal(
        passwordChecks(password, { userName: "", email: "" }).every((check) => check.passed),
        false
    );
});

test("new passwords accept 10 characters and reject 9 or more than 128", () => {
    assert.equal(ready("vK8!tL3@rQ"), true);
    assert.equal(ready("vK8!tL3@r"), false);
    assert.equal(ready("가📚".repeat(4) + "a1"), true);
    assert.equal(ready("가📚".repeat(63) + "a1"), true);
    assert.equal(ready("가📚".repeat(63) + "a12"), false);
    assert.match(signupPasswordError("1q2w3e4r5t", context)!, /널리 쓰이는/);
});

test("account check waits for nickname and a complete email instead of reporting a failure", () => {
    const password = "Reader-sunrise!482";
    for (const fields of [
        { userName: "", email: "" },
        { userName: "독자", email: "" },
        { userName: "", email: "reader@example.test" },
        { userName: "독자", email: "reader@" }
    ]) {
        const check = passwordChecks(password, fields).find((row) => row.id === "account-info")!;
        assert.equal(check.pending, true);
        assert.equal(check.passed, false);
    }
    const failed = passwordChecks(password, context).find((row) => row.id === "account-info")!;
    assert.equal(failed.pending, false);
    assert.equal(failed.passed, false);
    const passed = passwordChecks(password, { ...context, email: "other@example.test" }).find(
        (row) => row.id === "account-info"
    )!;
    assert.equal(passed.pending, false);
    assert.equal(passed.passed, true);
});
