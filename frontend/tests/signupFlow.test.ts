import assert from "node:assert/strict";
import test from "node:test";
import { validateSignup, validateSignupName } from "../src/lib/signupFlow.ts";

const valid = {
    userName: "책 읽는 사람",
    email: "reader@example.test",
    password: "책을 읽고 잠깐 쉬어가는 시간a1",
    passwordConfirm: "책을 읽고 잠깐 쉬어가는 시간a1"
};

test("empty signup reports every required field in focus order", () => {
    assert.deepEqual(
        Object.keys(validateSignup({ userName: "", email: "", password: "", passwordConfirm: "" })),
        ["userName", "email", "password", "passwordConfirm"]
    );
});
test("valid names, email and Unicode passphrases preserve the entered values", () => {
    const fields = { ...valid, userName: "  책 읽는 사람  ", email: " reader@example.test " };
    const before = { ...fields };
    assert.deepEqual(validateSignup(fields), {});
    assert.deepEqual(fields, before);
    const password = "가📚".repeat(63) + "a1";
    assert.deepEqual(validateSignup({ ...valid, password, passwordConfirm: password }), {});
    assert.ok(
        validateSignup({ ...valid, password: password + "끝", passwordConfirm: password + "끝" })
            .password
    );
});
test("email and display-name bounds match the signup API", () => {
    assert.ok(validateSignupName("  "));
    assert.equal(validateSignupName("가".repeat(80)), undefined);
    assert.ok(validateSignupName("가".repeat(81)));
    assert.ok(validateSignup({ ...valid, email: "invalid-address" }).email);
    assert.ok(validateSignup({ ...valid, email: "a".repeat(250) + "@example.test" }).email);
});
test("rejects short, repeated, malformed and mismatched passwords", () => {
    for (const password of ["short", "x".repeat(15), " ".repeat(20), "abcdefghijklmno\ud800"])
        assert.ok(validateSignup({ ...valid, password, passwordConfirm: password }).password);
    assert.ok(validateSignup({ ...valid, passwordConfirm: valid.password + " " }).passwordConfirm);
    assert.ok(validateSignup({ ...valid, passwordConfirm: "" }).passwordConfirm);
    assert.equal(
        validateSignup({ ...valid, passwordConfirm: "different password" }).password,
        undefined
    );
});
