import assert from "node:assert/strict";
import test from "node:test";
import { assessPassword, strengthValue } from "../src/lib/passwordStrength.ts";
import { passwordChecks } from "../src/lib/signupPassword.ts";
import { koreanKeyboardKeys } from "../src/lib/koreanPasswordPatterns.ts";

test("length and mixed characters cannot hide predictable patterns", () => {
    const repeated = assessPassword("aaaaaaaaaaaaaa1");
    const sequence = assessPassword("abcdefghijklmnop");
    const keyboard = assessPassword("qwertyuiopasdfgh");
    const passphrase = assessPassword("cedar-orbit-museum-river");
    assert.ok(repeated.value < 40);
    assert.match(repeated.warning ?? "", /반복/);
    assert.ok(sequence.value < 40);
    assert.match(sequence.warning ?? "", /순서/);
    assert.ok(keyboard.value < 40);
    assert.ok(passphrase.value > repeated.value + 30);
    // Guidance is independent of eligibility; do not quietly add a score gate.
    assert.equal(
        passwordChecks("aaaaaaaaaaaaaa1", { userName: "독자", email: "reader@example.test" }).every(
            (check) => check.passed
        ),
        true
    );
});
test("display preserves fine-grained changes, bounds scores and fails closed on invalid estimates", () => {
    const scores = Array.from({ length: 401 }, (_, index) => strengthValue(index / 20));
    assert.equal(new Set(scores).size, 101);
    assert.equal(strengthValue(-1), 0);
    assert.equal(strengthValue(300), 100);
    assert.equal(strengthValue(NaN), 0);
    assert.equal(strengthValue(Infinity), 0);
    const estimates = [
        "x",
        "xR",
        "xR7",
        "xR7!",
        "xR7!q",
        "xR7!qL",
        "xR7!qL3",
        "xR7!qL3@",
        "xR7!qL3@n",
        "xR7!qL3@nM"
    ].map((value) => assessPassword(value).value);
    assert.ok(new Set(estimates).size > 5);
});
test("personal context lowers estimates and assessment never returns password fragments", () => {
    const value = "MoonlitTangerine42";
    const plain = assessPassword(value);
    const contextual = assessPassword(value, ["MoonlitTangerine"]);
    assert.ok(contextual.value < plain.value);
    assert.deepEqual(Object.keys(contextual).sort(), ["label", "value", "warning"]);
    assert.ok(!JSON.stringify(contextual).includes("MoonlitTangerine"));
    assert.throws(() => assessPassword(""));
    assert.throws(() => assessPassword("a".repeat(129)));
});

test("Korean phrases, keyboard variants and one-character dictionary edits stay weak", () => {
    for (const value of ["안녕하세요123!", "dkssudgktpdy123!", "사랑해요1234!", "passwprd123"])
        assert.ok(assessPassword(value).value < 40, value);
    assert.ok(assessPassword("cedar-orbit-museum-river").value >= 80);
    const context = ["Reader", "reader@example.test"];
    assert.ok(
        assessPassword("Ｒｅａｄｅｒ1234!", context).value <=
            assessPassword("Reader1234!", context).value
    );
    assert.ok(assessPassword("dkssudgktpdy123!").value < assessPassword("vK8!tL3@rQ").value);
});

test("two-set keyboard projection handles composed, decomposed and compatibility Hangul", () => {
    assert.equal(koreanKeyboardKeys("한글"), "gksrmf");
    assert.equal(koreanKeyboardKeys("한글".normalize("NFD")), "gksrmf");
    assert.equal(koreanKeyboardKeys("안녕하세요"), "dkssudgktpdy");
    assert.equal(koreanKeyboardKeys("ㄱㄴㄷ"), "rse");
    assert.equal(koreanKeyboardKeys("값"), "rkqt");
    assert.equal(koreanKeyboardKeys("vK8!📚"), "vK8!📚");
});

test("repeat advice distinguishes incidental repeats from a dominant repeated block", () => {
    const incidental = assessPassword("tK7!aaaQv2");
    assert.equal(incidental.value, 47); // Changing the feedback must not inflate the estimate.
    assert.doesNotMatch(incidental.warning ?? "", /반복/);
    for (const value of ["aaaaaaQx1!", "abcabcabc1!", "사랑해요사랑해요a1"])
        assert.match(assessPassword(value).warning ?? "", /반복/);
});

test("warnings describe detected problems without giving unsolicited suggestions", () => {
    assert.equal(assessPassword("vK8!tL3@rQ").warning, null);
    assert.equal(assessPassword("cedar-orbit-museum-river").warning, null);
    for (const password of ["aaaaaaaaaaaaaa1", "dkssudgktpdy123!", "passwprd123"]) {
        const { warning } = assessPassword(password);
        assert.ok(warning);
        assert.doesNotMatch(warning, /보세요|주세요|권장|추천/);
    }
});

test("the easier display ceiling preserves low scores and the high-strength boundary", () => {
    assert.equal(strengthValue(10), 50);
    assert.equal(strengthValue(12), 60);
    assert.equal(strengthValue(15), 80);
    assert.equal(strengthValue(18), 100);
    const samples = Array.from({ length: 401 }, (_, i) => strengthValue(i / 20));
    assert.ok(samples.every((value, index) => index === 0 || value >= samples[index - 1]));
});
