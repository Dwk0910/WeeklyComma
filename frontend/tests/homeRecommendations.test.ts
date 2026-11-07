import assert from "node:assert/strict";
import test from "node:test";
import {
    initialCourse,
    registeredCourses,
    type HomeSelections
} from "../src/lib/homeRecommendations.ts";

test("only registered courses are offered, with a registered initial selection", () => {
    const selections: HomeSelections = {
        low: { isbn: "9781234567890", postId: "12" },
        mid: { isbn: "  ", postId: null },
        high: { isbn: "9781234567891", postId: null }
    };
    assert.deepEqual(
        registeredCourses(selections).map(({ key }) => key),
        ["low", "high"]
    );
    assert.equal(initialCourse(selections, "high"), "high");
    assert.equal(initialCourse(selections, "mid"), "low");
    assert.equal(initialCourse(selections, "invalid"), "low");
    assert.deepEqual(registeredCourses({}), []);
    assert.equal(initialCourse({}, "high"), null);
});
