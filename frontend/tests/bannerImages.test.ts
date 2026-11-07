import assert from "node:assert/strict";
import test from "node:test";
import { bannerDimensions, bannerSizes } from "../src/lib/bannerImages.ts";

test("large banners fit each display target without cropping their aspect ratio", () => {
    assert.deepEqual(bannerDimensions(6300, 3000, "bottom"), { width: 840, height: 400 });
    assert.deepEqual(bannerDimensions(6300, 3000, "left"), { width: 1680, height: 800 });
    for (const placement of ["left", "top", "bottom"] as const) {
        const size = bannerDimensions(2400, 3600, placement);
        assert.ok(size.width <= bannerSizes[placement].width);
        assert.ok(size.height <= bannerSizes[placement].height);
        assert.ok(Math.abs(size.width / size.height - 2 / 3) < 0.003);
    }
});

test("small images retain their original dimensions", () => {
    for (const placement of ["left", "top", "bottom"] as const) {
        assert.deepEqual(bannerDimensions(160, 80, placement), { width: 160, height: 80 });
    }
});
